// Aven's WebGL2 renderer. This is a bounded implementation of the operations
// used by gla-gl.cc and glbitmapfont.cc, not a general OpenGL compatibility API.
// Desktop builds retain their native GL implementation.
// Copyright (C) 2026. GPL-2.0-or-later.
#ifdef __EMSCRIPTEN__
#define AVEN_WEBGL_IMPLEMENTATION
#include "aven-webgl.h"
#include <GLES3/gl3.h>
#include <emscripten.h>
#include "aven-webgl-matrix.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <functional>
#include <map>
#include <memory>
#include <set>
#include <vector>

#ifndef GL_POINT_SPRITE
#define GL_POINT_SPRITE 0x8861
#define GL_COORD_REPLACE 0x8862
#endif
namespace {
using namespace aven_webgl;
using Colour = std::array<float,4>;
using Command = std::function<void()>;
// Keep the frequent immediate-mode operations compact and ordered. Recording
// complete vertices would incorrectly bake the caller's colour/normal/UV into
// a GL_COMPILE list: these attributes must still be inherited at replay time.
enum class GeometryCode { Vertex, Colour, Normal, TexCoord };
struct GeometryOp {
    GeometryCode code;
    float value[4];
};
constexpr size_t geometryBlockSize=8192;
constexpr size_t triangleBatchSize=3*4096;
using GeometryBlock=std::vector<GeometryOp>;
std::shared_ptr<GeometryBlock> recordingGeometry;
struct Vertex {
    float p[3], c[4], n[3], uv[2], dash;
};
struct State {
    std::set<GLenum> enabled;
    Colour colour{{1,1,1,1}}, normal{{0,0,1,0}};
    std::array<float,2> uv{{0,0}};
    Colour ambient{{0,0,0,1}}, diffuse{{1,1,1,1}}, specular{{1,1,1,1}};
    Colour materialSpecular{{0,0,0,1}}, fogColour{{0,0,0,0}};
    std::array<double,4> lightPosition{{0,0,1,0}};
    float shininess=0, fogStart=0, fogEnd=1, alphaRef=0, pointSize=1;
    GLenum alphaFunc=GL_ALWAYS, shade=GL_SMOOTH, polygon=GL_FILL;
    GLenum matrixMode=GL_MODELVIEW, fogMode=GL_EXP;
    int stippleFactor=1;
    unsigned stipplePattern=0xffff;
    GLuint texture=0, listBase=0;
    bool coordReplace=false;
    GLint viewport[4]={0,0,0,0};
    bool rasterValid=true;
    double raster[3]={0,0,0};
    Colour rasterColour{{1,1,1,1}};
};
State state;
std::vector<std::pair<GLbitfield,State>> attributes;
Matrix model=identity(), projection=identity();
std::vector<Matrix> modelStack, projectionStack;
std::map<GLuint,std::vector<Command>> lists;
GLuint nextList=1, compiling=0;
unsigned recursion=0;
GLenum errorCode=GL_NO_ERROR, primitive=GLenum(-1);
std::vector<Vertex> vertices;
GLuint program=0, buffer=0, vao=0, defaultTexture=0;
GLint unpackAlignment=4;
void error(GLenum code, const char* operation) {
    if (errorCode==GL_NO_ERROR) errorCode=code;
    std::fprintf(stderr,"Aven WebGL2: %s (0x%x)\n",operation,unsigned(code));
    EM_ASM({ Module.avenGL=Module.avenGL||{}; Module.avenGL.adapterErrors=(Module.avenGL.adapterErrors||0)+1; });
}
bool capture(Command command) {
    if (!compiling) return false;
    // A matrix/state change or nested list call is a strict ordering boundary.
    recordingGeometry.reset();
    lists[compiling].push_back(std::move(command));
    return true;
}
bool captureGeometry(GeometryCode code,float x,float y,float z=0,float w=0) {
    if(!compiling) return false;
    if(!recordingGeometry || recordingGeometry->size()==geometryBlockSize) {
        auto block=std::make_shared<GeometryBlock>();
        // Small lists stay small; growth is capped at one block, never at
        // the total size of the terrain command stream.
        block->reserve(16);
        lists[compiling].push_back([block] {
            for(const auto& op:*block) {
                const float* v=op.value;
                switch(op.code) {
                    case GeometryCode::Vertex: awglVertex3d(v[0],v[1],v[2]);break;
                    case GeometryCode::Colour: awglColor4f(v[0],v[1],v[2],v[3]);break;
                    case GeometryCode::Normal: awglNormal3d(v[0],v[1],v[2]);break;
                    case GeometryCode::TexCoord: awglTexCoord2f(v[0],v[1]);break;
                }
            }
        });
        recordingGeometry=std::move(block);
    }
    // Vertex already converts to float before rendering. Preserve that exact
    // precision without retaining a separately allocated closure per vertex.
    recordingGeometry->push_back({code,{x,y,z,w}});
    return true;
}
bool enabled(GLenum cap) { return state.enabled.count(cap)!=0; }
Matrix& matrix() { return state.matrixMode==GL_PROJECTION ? projection : model; }
bool nativeCapability(GLenum cap) {
    return cap==GL_DEPTH_TEST || cap==GL_BLEND || cap==GL_CULL_FACE ||
           cap==GL_POLYGON_OFFSET_FILL || cap==GL_SCISSOR_TEST || cap==GL_DITHER ||
           cap==GL_STENCIL_TEST;
}
bool emulatedCapability(GLenum cap) {
    return cap==GL_LIGHTING || cap==GL_LIGHT0 || cap==GL_COLOR_MATERIAL ||
           cap==GL_TEXTURE_2D || cap==GL_FOG || cap==GL_ALPHA_TEST ||
           cap==GL_POINT_SMOOTH || cap==GL_POINT_SPRITE || cap==GL_LINE_STIPPLE ||
           cap==GL_LINE_SMOOTH || cap==GL_NORMALIZE;
}
void setEnable(GLenum cap, bool value) {
    if (!nativeCapability(cap) && !emulatedCapability(cap)) {
        error(GL_INVALID_ENUM,"enable capability outside Aven subset"); return;
    }
    if (value) state.enabled.insert(cap); else state.enabled.erase(cap);
    if (nativeCapability(cap)) { if(value) glEnable(cap); else glDisable(cap); }
}
GLuint shader(GLenum type,const char* source) {
    GLuint result=glCreateShader(type);
    glShaderSource(result,1,&source,nullptr); glCompileShader(result);
    GLint ok=0; glGetShaderiv(result,GL_COMPILE_STATUS,&ok);
    if(!ok) { char log[8192]; glGetShaderInfoLog(result,sizeof log,nullptr,log);
        std::fprintf(stderr,"Aven WebGL2 shader: %s\n",log); std::abort(); }
    return result;
}
GLuint textureObject(GLuint texture) {
    if(texture) return texture;
    if(!defaultTexture) {
        glGenTextures(1,&defaultTexture);glBindTexture(GL_TEXTURE_2D,defaultTexture);
        const GLubyte white[]={255,255,255,255};
        glTexImage2D(GL_TEXTURE_2D,0,GL_RGBA,1,1,0,GL_RGBA,GL_UNSIGNED_BYTE,white);
        glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_NEAREST);
        glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_NEAREST);
    }
    return defaultTexture;
}
void init() {
    if(program) return;
    const char* vs=R"GLSL(#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec4 colour;
layout(location=2) in vec3 normal;
layout(location=3) in vec2 texcoord;
layout(location=4) in float dash;
uniform mat4 modelview, projection;
uniform mat3 normalMatrix;
uniform float pointSize, shininess;
uniform bool lighting;
uniform vec4 lightPosition, lightAmbient, lightDiffuse, lightSpecular, materialSpecular;
out vec4 vColour;
out vec2 vUV, vDash;
out float vFog;
void main() {
    vec4 eye=modelview*vec4(position,1.0);
    gl_Position=projection*eye;
    gl_PointSize=pointSize;
    vColour=colour;
    if(lighting) {
        vec3 n=normalize(normalMatrix*normal);
        vec3 l=normalize(lightPosition.xyz-eye.xyz*lightPosition.w);
        float diffuse=max(dot(n,l),0.0);
        vec3 halfway=normalize(l+vec3(0.0,0.0,1.0));
        float spec=diffuse>0.0 ? pow(max(dot(n,halfway),0.0),shininess):0.0;
        vColour.rgb=colour.rgb*(vec3(0.2)+lightAmbient.rgb+lightDiffuse.rgb*diffuse)
                    + materialSpecular.rgb*lightSpecular.rgb*spec;
        vColour=clamp(vColour,0.0,1.0);
    }
    vUV=texcoord;
    vDash=vec2(dash*gl_Position.w,gl_Position.w);
    vFog=abs(eye.z);
})GLSL";
    const char* fs=R"GLSL(#version 300 es
precision highp float;
precision highp int;
in vec4 vColour;
in vec2 vUV, vDash;
in float vFog;
uniform bool textured, pointSprite, roundPoint, fogEnabled, alphaEnabled, stippled, smoothLine;
uniform sampler2D image;
uniform vec4 fogColour;
uniform float fogStart, fogEnd, alphaRef;
uniform int alphaFunc, stippleFactor;
uniform uint stipplePattern;
out vec4 fragment;
void main() {
    if(roundPoint && length(gl_PointCoord-vec2(0.5))>0.5) discard;
    if(stippled) {
        uint bit=uint(floor(max(0.0,vDash.x/vDash.y)/float(stippleFactor)))&15u;
        if((stipplePattern & (1u<<bit))==0u) discard;
    }
    vec4 c=vColour;
    if(textured) c*=texture(image,pointSprite ? gl_PointCoord : vUV);
    if(smoothLine) c.a*=clamp(1.0-abs(vUV.x),0.0,1.0);
    if(alphaEnabled) {
        bool keep=alphaFunc==519 || (alphaFunc==516 && c.a>alphaRef) ||
           (alphaFunc==518 && c.a>=alphaRef) || (alphaFunc==513 && c.a<alphaRef) ||
           (alphaFunc==515 && c.a<=alphaRef) || (alphaFunc==514 && c.a==alphaRef) ||
           (alphaFunc==517 && c.a!=alphaRef);
        if(!keep) discard;
    }
    if(fogEnabled) c.rgb=mix(fogColour.rgb,c.rgb,clamp((fogEnd-vFog)/(fogEnd-fogStart),0.0,1.0));
    fragment=c;
})GLSL";
    GLuint v=shader(GL_VERTEX_SHADER,vs), f=shader(GL_FRAGMENT_SHADER,fs);
    program=glCreateProgram(); glAttachShader(program,v); glAttachShader(program,f);
    glLinkProgram(program); glDeleteShader(v); glDeleteShader(f);
    GLint ok=0; glGetProgramiv(program,GL_LINK_STATUS,&ok);
    if(!ok) { char log[8192]; glGetProgramInfoLog(program,sizeof log,nullptr,log);
        std::fprintf(stderr,"Aven WebGL2 program: %s\n",log); std::abort(); }
    glGenBuffers(1,&buffer); glGenVertexArrays(1,&vao);
}
GLint uniform(const char* name) { return glGetUniformLocation(program,name); }
void flag(const char* name,bool value) { glUniform1i(uniform(name),value); }
void rgba(const char* name,const Colour& value) { glUniform4fv(uniform(name),1,value.data()); }
void render(GLenum mode,const std::vector<Vertex>& data,bool screen=false,bool smoothLine=false) {
    if(data.empty()) return;
    init(); glUseProgram(program); glBindVertexArray(vao); glBindBuffer(GL_ARRAY_BUFFER,buffer);
    glBufferData(GL_ARRAY_BUFFER,data.size()*sizeof(Vertex),data.data(),GL_STREAM_DRAW);
    const int size[]={3,4,3,2,1}; const size_t offset[]={0,3,7,10,12};
    for(int i=0;i<5;++i) { glEnableVertexAttribArray(i);
        glVertexAttribPointer(i,size[i],GL_FLOAT,GL_FALSE,sizeof(Vertex),reinterpret_cast<void*>(offset[i]*sizeof(float))); }
    Matrix m=screen ? identity():model;
    Matrix p=screen ? ortho(state.viewport[0],state.viewport[0]+state.viewport[2],state.viewport[1],state.viewport[1]+state.viewport[3],-1,1):projection;
    float mf[16],pf[16],nf[9];
    for(int i=0;i<16;++i) {mf[i]=m[i];pf[i]=p[i];}
    Matrix inv; if(!inverse(m,inv)) inv=identity();
    for(int col=0;col<3;++col) for(int row=0;row<3;++row) nf[col*3+row]=inv[row*4+col];
    glUniformMatrix4fv(uniform("modelview"),1,GL_FALSE,mf);
    glUniformMatrix4fv(uniform("projection"),1,GL_FALSE,pf);
    glUniformMatrix3fv(uniform("normalMatrix"),1,GL_FALSE,nf);
    glUniform1f(uniform("pointSize"),state.pointSize);
    flag("lighting",!screen && enabled(GL_LIGHTING) && enabled(GL_LIGHT0));
    Colour lp; for(int i=0;i<4;++i) lp[i]=state.lightPosition[i];
    rgba("lightPosition",lp);rgba("lightAmbient",state.ambient);rgba("lightDiffuse",state.diffuse);
    rgba("lightSpecular",state.specular);rgba("materialSpecular",state.materialSpecular);
    glUniform1f(uniform("shininess"),state.shininess);
    flag("textured",!screen && enabled(GL_TEXTURE_2D));
    flag("pointSprite",mode==GL_POINTS && enabled(GL_POINT_SPRITE) && state.coordReplace);
    flag("roundPoint",mode==GL_POINTS && enabled(GL_POINT_SMOOTH));
    flag("fogEnabled",!screen && enabled(GL_FOG)); rgba("fogColour",state.fogColour);
    glUniform1f(uniform("fogStart"),state.fogStart); glUniform1f(uniform("fogEnd"),state.fogEnd);
    flag("alphaEnabled",enabled(GL_ALPHA_TEST)); glUniform1f(uniform("alphaRef"),state.alphaRef);
    glUniform1i(uniform("alphaFunc"),state.alphaFunc);
    flag("smoothLine",smoothLine);
    flag("stippled",(mode==GL_LINES || smoothLine) && enabled(GL_LINE_STIPPLE));
    glUniform1i(uniform("stippleFactor"),state.stippleFactor);
    glUniform1ui(uniform("stipplePattern"),state.stipplePattern);
    glActiveTexture(GL_TEXTURE0); glBindTexture(GL_TEXTURE_2D,textureObject(state.texture)); glUniform1i(uniform("image"),0);
    glDrawArrays(mode,0,data.size());
    EM_ASM({ Module.avenGL=Module.avenGL||{}; const d=Module.avenGL; d.draws=(d.draws||0)+1; d.vertices=(d.vertices||0)+$0; d.maxDrawVertices=Math.max(d.maxDrawVertices||0,$0); d.backend="WebGL2 shader/VBO"; }, int(data.size()));
    glBindVertexArray(0);
}
Vertex vertex(double x,double y,double z) {
    Vertex v{}; v.p[0]=x;v.p[1]=y;v.p[2]=z;
    std::copy(state.colour.begin(),state.colour.end(),v.c);
    std::copy(state.normal.begin(),state.normal.begin()+3,v.n);
    std::copy(state.uv.begin(),state.uv.end(),v.uv);return v;
}
Vertex interpolate(const Vertex& a,const Vertex& b,double t) {
    Vertex v;
    for(int i=0;i<3;++i) {v.p[i]=a.p[i]+t*(b.p[i]-a.p[i]);v.n[i]=a.n[i]+t*(b.n[i]-a.n[i]);}
    for(int i=0;i<4;++i) v.c[i]=a.c[i]+t*(b.c[i]-a.c[i]);
    for(int i=0;i<2;++i) v.uv[i]=a.uv[i]+t*(b.uv[i]-a.uv[i]);
    v.dash=a.dash+t*(b.dash-a.dash);
    return v;
}
void flat(Vertex& a,const Vertex& last) {
    if(state.shade==GL_FLAT) {std::copy(last.c,last.c+4,a.c);std::copy(last.n,last.n+3,a.n);}
}
double distance(const Vertex& a,const Vertex& b) {
    double ax,ay,az,bx,by,bz;
    if(!project(a.p[0],a.p[1],a.p[2],model.data(),projection.data(),state.viewport,&ax,&ay,&az) ||
       !project(b.p[0],b.p[1],b.p[2],model.data(),projection.data(),state.viewport,&bx,&by,&bz)) return 0;
    return std::hypot(bx-ax,by-ay);
}
}

void awglBegin(GLenum mode) {
    if(capture([=]{awglBegin(mode);})) return;
    if(primitive!=GLenum(-1)) {error(GL_INVALID_OPERATION,"nested begin");return;}
    primitive=mode;vertices.clear();
    if(mode==GL_TRIANGLES && vertices.capacity()<triangleBatchSize)
        vertices.reserve(triangleBatchSize);
}
namespace {
// Independent triangles can be submitted as they arrive: all attributes are
// per vertex, while matrices and render state cannot change inside glBegin.
// The terrain list is replayed for both depth and colour passes, so keep each
// complete triangle and its ordering, with bounded CPU and upload buffers.
void drawPrimitive() {
    if(primitive==GL_TRIANGLES && state.polygon!=GL_LINE) {
        vertices.resize(vertices.size()/3*3);
        if(state.shade==GL_FLAT) for(size_t i=2;i<vertices.size();i+=3) {
            flat(vertices[i-2],vertices[i]);flat(vertices[i-1],vertices[i]);
        }
        render(GL_TRIANGLES,vertices);
        return;
    }
    std::vector<Vertex> out;
    auto line=[&](size_t a,size_t b,double start=0.0) {
        Vertex va=vertices[a],vb=vertices[b];flat(va,vb);
        va.dash=start;vb.dash=start+distance(va,vb);out.push_back(va);out.push_back(vb);
    };
    auto tri=[&](size_t a,size_t b,size_t c,size_t provoking) {
        Vertex va=vertices[a],vb=vertices[b],vc=vertices[c];
        flat(va,vertices[provoking]);flat(vb,vertices[provoking]);flat(vc,vertices[provoking]);
        out.push_back(va);out.push_back(vb);out.push_back(vc);
    };
    size_t n=vertices.size();GLenum mode=GL_TRIANGLES;
    bool wire=state.polygon==GL_LINE;
    switch(primitive) {
        case GL_POINTS: out=vertices;mode=GL_POINTS;break;
        case GL_LINES: for(size_t i=1;i<n;i+=2) line(i-1,i);mode=GL_LINES;break;
        case GL_LINE_LOOP: case GL_LINE_STRIP: {
            double d=0;for(size_t i=1;i<n;++i) {line(i-1,i,d);d=out.back().dash;}
            if(primitive==GL_LINE_LOOP && n>1) line(n-1,0,d);mode=GL_LINES;break;
        }
        case GL_TRIANGLES:
            for(size_t i=2;i<n;i+=3) if(wire) {line(i-2,i-1);line(i-1,i);line(i,i-2);}else tri(i-2,i-1,i,i);
            break;
        case GL_QUADS:
            for(size_t i=3;i<n;i+=4) if(wire) {line(i-3,i-2);line(i-2,i-1);line(i-1,i);line(i,i-3);}
                else {tri(i-3,i-2,i-1,i);tri(i-3,i-1,i,i);}
            break;
        case GL_TRIANGLE_STRIP:
            for(size_t i=2;i<n;++i) if(wire) {line(i-2,i-1);line(i-1,i);line(i,i-2);}
                else if(i&1)tri(i-1,i-2,i,i);else tri(i-2,i-1,i,i);
            break;
        case GL_TRIANGLE_FAN: case GL_POLYGON:
            if(wire) {for(size_t i=1;i<n;++i)line(i-1,i);if(n>1)line(n-1,0);}
            else for(size_t i=2;i<n;++i)tri(0,i-1,i,primitive==GL_POLYGON ? 0:i);break;
        default:error(GL_INVALID_ENUM,"primitive outside Aven subset");break;
    }
    if(wire && mode==GL_TRIANGLES)mode=GL_LINES;
    if(mode==GL_LINES && enabled(GL_LINE_SMOOTH)) {
        // WebGL has no LINE_SMOOTH. Expand to screen-space triangles and
        // calculate one-pixel coverage in the fragment shader. Clip before
        // division by w: projecting an endpoint behind the camera first
        // otherwise creates spurious lines across the viewport.
        std::vector<Vertex> coverage;
        const Matrix combined=multiply(projection,model);
        for(size_t i=1;i<out.size();i+=2) {
            const Vertex& originalA=out[i-1];const Vertex& originalB=out[i];
            const auto clipA=transform(combined,{{originalA.p[0],originalA.p[1],originalA.p[2],1}});
            const auto clipB=transform(combined,{{originalB.p[0],originalB.p[1],originalB.p[2],1}});
            double first,last;
            if(!clip_segment(clipA,clipB,first,last)) continue;
            Vertex a=interpolate(originalA,originalB,first),b=interpolate(originalA,originalB,last);
            std::array<double,3> screenA,screenB;
            for(int component=0;component<3;++component) {
                screenA[component]=(clipA[component]+first*(clipB[component]-clipA[component]))/
                                   (clipA[3]+first*(clipB[3]-clipA[3]));
                screenB[component]=(clipA[component]+last*(clipB[component]-clipA[component]))/
                                   (clipA[3]+last*(clipB[3]-clipA[3]));
            }
            const double ax=state.viewport[0]+(screenA[0]+1)*state.viewport[2]*.5;
            const double ay=state.viewport[1]+(screenA[1]+1)*state.viewport[3]*.5;
            const double bx=state.viewport[0]+(screenB[0]+1)*state.viewport[2]*.5;
            const double by=state.viewport[1]+(screenB[1]+1)*state.viewport[3]*.5;
            const double az=(screenA[2]+1)*.5,bz=(screenB[2]+1)*.5;
            double length=std::hypot(bx-ax,by-ay);if(length==0)continue;
            if(enabled(GL_FOG)) {
                for(Vertex* v:{&a,&b}) {
                    auto eye=transform(model,{{v->p[0],v->p[1],v->p[2],1}});
                    double weight=std::max(0.0,std::min(1.0,(state.fogEnd-std::abs(eye[2]))/(state.fogEnd-state.fogStart)));
                    for(int j=0;j<3;++j)v->c[j]=weight*v->c[j]+(1-weight)*state.fogColour[j];
                }
            }
            double nx=-(by-ay)/length,ny=(bx-ax)/length;
            Vertex al=a,ar=a,bl=b,br=b;
            al.p[0]=ax+nx;al.p[1]=ay+ny;ar.p[0]=ax-nx;ar.p[1]=ay-ny;
            bl.p[0]=bx+nx;bl.p[1]=by+ny;br.p[0]=bx-nx;br.p[1]=by-ny;
            al.p[2]=ar.p[2]=1-2*az;bl.p[2]=br.p[2]=1-2*bz;
            al.uv[0]=bl.uv[0]=1;ar.uv[0]=br.uv[0]=-1;
            coverage.insert(coverage.end(),{al,ar,br,al,br,bl});
        }
        render(GL_TRIANGLES,coverage,true,true);
    } else render(mode,out);
}
}
void awglEnd() {
    if(capture([]{awglEnd();})) return;
    drawPrimitive();
    vertices.clear();primitive=GLenum(-1);
}
void awglVertex3d(GLdouble x,GLdouble y,GLdouble z) {
    if(captureGeometry(GeometryCode::Vertex,x,y,z))return;
    if(primitive==GLenum(-1)){error(GL_INVALID_OPERATION,"vertex outside begin");return;}
    vertices.push_back(vertex(x,y,z));
    if(primitive==GL_TRIANGLES && vertices.size()==triangleBatchSize) {
        drawPrimitive();vertices.clear();
    }
}
void awglColor4f(GLfloat r,GLfloat g,GLfloat b,GLfloat a) {
    if(captureGeometry(GeometryCode::Colour,r,g,b,a))return;state.colour={{r,g,b,a}};
}
void awglColor4d(GLdouble r,GLdouble g,GLdouble b,GLdouble a){awglColor4f(r,g,b,a);}
void awglColor4ub(GLubyte r,GLubyte g,GLubyte b,GLubyte a){awglColor4f(r/255.f,g/255.f,b/255.f,a/255.f);}
void awglColor3ubv(const GLubyte* c){awglColor4ub(c[0],c[1],c[2],255);}
void awglNormal3d(GLdouble x,GLdouble y,GLdouble z){if(captureGeometry(GeometryCode::Normal,x,y,z))return;state.normal={{float(x),float(y),float(z),0}};}
void awglTexCoord2f(GLfloat x,GLfloat y){if(captureGeometry(GeometryCode::TexCoord,x,y))return;state.uv={{x,y}};}
void awglEnable(GLenum cap){if(capture([=]{awglEnable(cap);}))return;setEnable(cap,true);}
void awglDisable(GLenum cap){if(capture([=]{awglDisable(cap);}))return;setEnable(cap,false);}
void awglMatrixMode(GLenum mode){if(capture([=]{awglMatrixMode(mode);}))return;if(mode!=GL_MODELVIEW&&mode!=GL_PROJECTION){error(GL_INVALID_ENUM,"matrix mode");return;}state.matrixMode=mode;}
void awglLoadIdentity(){if(capture([]{awglLoadIdentity();}))return;matrix()=identity();}
void awglPushMatrix(){if(capture([]{awglPushMatrix();}))return;(state.matrixMode==GL_PROJECTION?projectionStack:modelStack).push_back(matrix());}
void awglPopMatrix(){if(capture([]{awglPopMatrix();}))return;auto& s=state.matrixMode==GL_PROJECTION?projectionStack:modelStack;if(s.empty()){error(GL_STACK_UNDERFLOW,"matrix stack");return;}matrix()=s.back();s.pop_back();}
void awglTranslated(GLdouble x,GLdouble y,GLdouble z){if(capture([=]{awglTranslated(x,y,z);}))return;matrix()=multiply(matrix(),translation(x,y,z));}
void awglScaled(GLdouble x,GLdouble y,GLdouble z){if(capture([=]{awglScaled(x,y,z);}))return;matrix()=multiply(matrix(),scale(x,y,z));}
void awglRotated(GLdouble a,GLdouble x,GLdouble y,GLdouble z){if(capture([=]{awglRotated(a,x,y,z);}))return;matrix()=multiply(matrix(),rotation(a,x,y,z));}
void awglOrtho(GLdouble l,GLdouble r,GLdouble b,GLdouble t,GLdouble n,GLdouble f){if(capture([=]{awglOrtho(l,r,b,t,n,f);}))return;matrix()=multiply(matrix(),ortho(l,r,b,t,n,f));}
void awglFrustum(GLdouble l,GLdouble r,GLdouble b,GLdouble t,GLdouble n,GLdouble f){if(capture([=]{awglFrustum(l,r,b,t,n,f);}))return;matrix()=multiply(matrix(),frustum(l,r,b,t,n,f));}
void awglViewport(GLint x,GLint y,GLsizei w,GLsizei h){if(capture([=]{awglViewport(x,y,w,h);}))return;state.viewport[0]=x;state.viewport[1]=y;state.viewport[2]=w;state.viewport[3]=h;glViewport(x,y,w,h);}
GLuint awglGenLists(GLsizei count){if(count<0){error(GL_INVALID_VALUE,"list count");return 0;}GLuint base=nextList;nextList+=count;return base;}
void awglNewList(GLuint id,GLenum mode){if(compiling||mode!=GL_COMPILE||!id){error(GL_INVALID_OPERATION,"new list");return;}recordingGeometry.reset();lists[id].clear();compiling=id;}
void awglEndList(){if(!compiling){error(GL_INVALID_OPERATION,"end list");return;}recordingGeometry.reset();compiling=0;}
void awglDeleteLists(GLuint id,GLsizei count){for(GLsizei i=0;i<count;++i)lists.erase(id+i);}
void awglCallList(GLuint id){if(capture([=]{awglCallList(id);}))return;auto i=lists.find(id);if(i==lists.end())return;if(++recursion>64){error(GL_STACK_OVERFLOW,"recursive list");--recursion;return;}for(const auto& c:i->second)c();--recursion;}
void awglListBase(GLuint id){if(capture([=]{awglListBase(id);}))return;state.listBase=id;}
void awglCallLists(GLsizei n,GLenum type,const GLvoid* data){
    std::vector<GLuint> ids;for(GLsizei i=0;i<n;++i){GLuint id;
        if(type==GL_UNSIGNED_BYTE)id=static_cast<const GLubyte*>(data)[i];
        else if(type==GL_UNSIGNED_SHORT)id=static_cast<const GLushort*>(data)[i];
        else if(type==GL_UNSIGNED_INT)id=static_cast<const GLuint*>(data)[i];
        else{error(GL_INVALID_ENUM,"list element type");return;}ids.push_back(id);}
    if(capture([=]{awglCallLists(ids.size(),GL_UNSIGNED_INT,ids.data());}))return;
    for(GLuint id:ids)awglCallList(state.listBase+id);
}
void awglRasterPos3d(GLdouble x,GLdouble y,GLdouble z){
    if(capture([=]{awglRasterPos3d(x,y,z);}))return;
    auto clip=transform(multiply(projection,model),{{x,y,z,1}});
    state.rasterValid=clip[3]>0 && std::abs(clip[0])<=clip[3] && std::abs(clip[1])<=clip[3] && std::abs(clip[2])<=clip[3];
    if(state.rasterValid)project(x,y,z,model.data(),projection.data(),state.viewport,&state.raster[0],&state.raster[1],&state.raster[2]);
    state.rasterColour=state.colour;
}
void awglRasterPos2d(GLdouble x,GLdouble y){awglRasterPos3d(x,y,0);}
void awglBitmap(GLsizei w,GLsizei h,GLfloat xo,GLfloat yo,GLfloat xm,GLfloat ym,const GLubyte* bits){
    if(w<0||h<0){error(GL_INVALID_VALUE,"bitmap dimensions");return;}
    size_t row=(size_t(w)+7)/8;row=(row+unpackAlignment-1)/unpackAlignment*unpackAlignment;
    if(compiling){std::vector<GLubyte> copy;if(w&&h&&bits)copy.assign(bits,bits+row*h);
        capture([=]{awglBitmap(w,h,xo,yo,xm,ym,copy.empty()?nullptr:copy.data());});return;}
    if(!state.rasterValid)return;
    EM_ASM({ Module.avenGL=Module.avenGL||{}; Module.avenGL.bitmaps=(Module.avenGL.bitmaps||0)+1; });
    std::vector<Vertex> out;Colour saved=state.colour;state.colour=state.rasterColour;
    double z=1-2*state.raster[2];
    for(int y=0;y<h;++y)for(int x=0;x<w;++x)if(bits&&(bits[y*row+x/8]&(0x80>>(x%8)))){
        double l=std::floor(state.raster[0]-xo+x),b=std::floor(state.raster[1]-yo+y);
        Vertex a=vertex(l,b,z),c=vertex(l+1,b+1,z),d=vertex(l,b+1,z),e=vertex(l+1,b,z);
        out.insert(out.end(),{a,e,c,a,c,d});
    }
    render(GL_TRIANGLES,out,true);state.colour=saved;state.raster[0]+=xm;state.raster[1]+=ym;
}
void awglPushAttrib(GLbitfield mask){if(capture([=]{awglPushAttrib(mask);}))return;attributes.emplace_back(mask,state);}
void awglPopAttrib(){
    if(capture([]{awglPopAttrib();}))return;
    if(attributes.empty()){error(GL_STACK_UNDERFLOW,"attribute stack");return;}
    GLbitfield mask=attributes.back().first;State old=attributes.back().second;attributes.pop_back();
    if(mask&GL_ENABLE_BIT){auto all=state.enabled;all.insert(old.enabled.begin(),old.enabled.end());for(GLenum cap:all)setEnable(cap,old.enabled.count(cap));}
    if(mask&GL_LIGHTING_BIT){state.ambient=old.ambient;state.diffuse=old.diffuse;state.specular=old.specular;state.materialSpecular=old.materialSpecular;state.lightPosition=old.lightPosition;state.shininess=old.shininess;state.shade=old.shade;for(GLenum cap:{GL_LIGHTING,GL_LIGHT0,GL_COLOR_MATERIAL})setEnable(cap,old.enabled.count(cap));}
    if(mask&GL_POINT_BIT){state.pointSize=old.pointSize;state.coordReplace=old.coordReplace;setEnable(GL_POINT_SMOOTH,old.enabled.count(GL_POINT_SMOOTH));}
    if(mask&GL_POLYGON_BIT)state.polygon=old.polygon;
    if(mask&GL_TRANSFORM_BIT)state.matrixMode=old.matrixMode;
    if(mask&GL_VIEWPORT_BIT)awglViewport(old.viewport[0],old.viewport[1],old.viewport[2],old.viewport[3]);
    if(mask&GL_CURRENT_BIT){state.colour=old.colour;state.normal=old.normal;state.uv=old.uv;state.rasterColour=old.rasterColour;state.rasterValid=old.rasterValid;std::copy(old.raster,old.raster+3,state.raster);}
    if(mask&GL_LINE_BIT){state.stippleFactor=old.stippleFactor;state.stipplePattern=old.stipplePattern;setEnable(GL_LINE_STIPPLE,old.enabled.count(GL_LINE_STIPPLE));setEnable(GL_LINE_SMOOTH,old.enabled.count(GL_LINE_SMOOTH));}
}
void awglShadeModel(GLenum mode){if(capture([=]{awglShadeModel(mode);}))return;if(mode!=GL_FLAT&&mode!=GL_SMOOTH){error(GL_INVALID_ENUM,"shade model");return;}state.shade=mode;}
void awglPolygonMode(GLenum face,GLenum mode){if(capture([=]{awglPolygonMode(face,mode);}))return;if(face!=GL_FRONT_AND_BACK||(mode!=GL_FILL&&mode!=GL_LINE)){error(GL_INVALID_ENUM,"polygon mode outside Aven subset");return;}state.polygon=mode;}
void awglPointSize(GLfloat size){if(capture([=]{awglPointSize(size);}))return;if(size<=0){error(GL_INVALID_VALUE,"point size");return;}state.pointSize=size;}
void awglLineStipple(GLint factor,GLushort pattern){if(capture([=]{awglLineStipple(factor,pattern);}))return;state.stippleFactor=std::max(1,std::min(256,factor));state.stipplePattern=pattern;}
void awglAlphaFunc(GLenum f,GLfloat ref){if(capture([=]{awglAlphaFunc(f,ref);}))return;state.alphaFunc=f;state.alphaRef=std::max(0.f,std::min(1.f,ref));}
void awglFogf(GLenum p,GLfloat value){if(capture([=]{awglFogf(p,value);}))return;if(p==GL_FOG_START)state.fogStart=value;else if(p==GL_FOG_END)state.fogEnd=value;else if(p==GL_FOG_MODE){if(value!=GL_LINEAR){error(GL_INVALID_ENUM,"only linear Aven fog supported");return;}state.fogMode=GL_LINEAR;}else error(GL_INVALID_ENUM,"fog parameter");}
void awglFogi(GLenum p,GLint v){awglFogf(p,v);}
void awglFogfv(GLenum p,const GLfloat* values){if(p!=GL_FOG_COLOR){awglFogf(p,values[0]);return;}Colour v;std::copy(values,values+4,v.begin());if(capture([=]{awglFogfv(p,v.data());}))return;state.fogColour=v;}
void awglMaterialf(GLenum face,GLenum p,GLfloat v){if(capture([=]{awglMaterialf(face,p,v);}))return;if(face!=GL_FRONT_AND_BACK||p!=GL_SHININESS){error(GL_INVALID_ENUM,"material scalar");return;}state.shininess=v;}
void awglMaterialfv(GLenum face,GLenum p,const GLfloat* values){Colour v;std::copy(values,values+4,v.begin());if(capture([=]{awglMaterialfv(face,p,v.data());}))return;if(face!=GL_FRONT_AND_BACK||p!=GL_SPECULAR){error(GL_INVALID_ENUM,"material vector");return;}state.materialSpecular=v;}
void awglColorMaterial(GLenum face,GLenum mode){if(capture([=]{awglColorMaterial(face,mode);}))return;if(face!=GL_FRONT_AND_BACK||mode!=GL_AMBIENT_AND_DIFFUSE)error(GL_INVALID_ENUM,"colour material outside Aven subset");/* The shader tracks vertex colour for both ambient and diffuse. */}
void awglLightfv(GLenum light,GLenum p,const GLfloat* values){Colour v;std::copy(values,values+4,v.begin());if(capture([=]{awglLightfv(light,p,v.data());}))return;if(light!=GL_LIGHT0){error(GL_INVALID_ENUM,"light outside Aven subset");return;}if(p==GL_AMBIENT)state.ambient=v;else if(p==GL_DIFFUSE)state.diffuse=v;else if(p==GL_SPECULAR)state.specular=v;else if(p==GL_POSITION)state.lightPosition=transform(model,{{v[0],v[1],v[2],v[3]}});else error(GL_INVALID_ENUM,"light parameter");}
void awglHint(GLenum target,GLenum value){if(capture([=]{awglHint(target,value);}))return;if(value!=GL_FASTEST&&value!=GL_NICEST&&value!=GL_DONT_CARE){error(GL_INVALID_ENUM,"hint quality");return;}
    // OpenGL hints are expressly non-binding. Fog is computed per vertex;
    // texture interpolation is perspective correct in the WebGL2 shader.
    if(target!=GL_FOG_HINT&&target!=GL_PERSPECTIVE_CORRECTION_HINT&&target!=GL_LINE_SMOOTH_HINT)glHint(target,value);
}
void awglTexEnvi(GLenum target,GLenum p,GLint value){if(capture([=]{awglTexEnvi(target,p,value);}))return;if(target==GL_POINT_SPRITE&&p==GL_COORD_REPLACE)state.coordReplace=value;else if(target!=GL_TEXTURE_ENV||p!=GL_TEXTURE_ENV_MODE||value!=GL_MODULATE)error(GL_INVALID_ENUM,"texture environment outside Aven subset");/* MODULATE is the shader's explicit texture*colour operation. */}
void awglBindTexture(GLenum target,GLuint texture){if(capture([=]{awglBindTexture(target,texture);}))return;if(target!=GL_TEXTURE_2D){error(GL_INVALID_ENUM,"texture target");return;}state.texture=texture;glBindTexture(target,textureObject(texture));}
void awglTexParameteri(GLenum target,GLenum p,GLint value){if(capture([=]{awglTexParameteri(target,p,value);}))return;if(value==GL_CLAMP)value=GL_CLAMP_TO_EDGE;
    // WebGL has no default texture object: map desktop texture zero to
    // a private complete 1x1 white texture and retain its parameters.
    glBindTexture(target,textureObject(state.texture));
    glTexParameteri(target,p,value);
}
void awglGenTextures(GLsizei n,GLuint* ids){glGenTextures(n,ids);}
void awglPixelStorei(GLenum p,GLint v){if(p==GL_UNPACK_ALIGNMENT)unpackAlignment=v;glPixelStorei(p,v);}
void awglTexImage2D(GLenum target,GLint level,GLint internal,GLsizei w,GLsizei h,GLint border,GLenum format,GLenum type,const GLvoid* pixels){
    if(compiling){error(GL_INVALID_OPERATION,"texture upload in display list outside Aven subset");return;}
    if(format==GL_LUMINANCE_ALPHA&&type==GL_UNSIGNED_BYTE){std::vector<GLubyte> rgba(size_t(w)*h*4);const GLubyte* in=static_cast<const GLubyte*>(pixels);size_t stride=(w*2+unpackAlignment-1)/unpackAlignment*unpackAlignment;
        for(int y=0;y<h;++y)for(int x=0;x<w;++x){size_t i=(size_t(y)*w+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=in[y*stride+x*2];rgba[i+3]=in[y*stride+x*2+1];}
        glTexImage2D(target,level,GL_RGBA,w,h,border,GL_RGBA,type,rgba.data());
    }else glTexImage2D(target,level,internal,w,h,border,format,type,pixels);
}
void awglGetFloatv(GLenum p,GLfloat* out){
    if(p==GL_MODELVIEW_MATRIX||p==GL_PROJECTION_MATRIX){const auto& m=p==GL_MODELVIEW_MATRIX?model:projection;std::copy(m.begin(),m.end(),out);}
    else if(p==GL_POINT_SIZE_RANGE||p==GL_ALIASED_POINT_SIZE_RANGE)glGetFloatv(GL_ALIASED_POINT_SIZE_RANGE,out);
    else if(p==GL_POINT_SIZE_GRANULARITY)*out=1;
    else if(p==0x8127){float range[2];glGetFloatv(GL_ALIASED_POINT_SIZE_RANGE,range);*out=range[1];}
    else if(p==GL_POINT_SIZE)*out=state.pointSize;
    else glGetFloatv(p,out);
}
void awglGetDoublev(GLenum p,GLdouble* out){if(p==GL_MODELVIEW_MATRIX||p==GL_PROJECTION_MATRIX){const auto& m=p==GL_MODELVIEW_MATRIX?model:projection;std::copy(m.begin(),m.end(),out);return;}float f[16]={};awglGetFloatv(p,f);int n=(p==GL_POINT_SIZE_RANGE||p==GL_ALIASED_POINT_SIZE_RANGE)?2:1;for(int i=0;i<n;++i)out[i]=f[i];}
void awglGetIntegerv(GLenum p,GLint* out){if(p==GL_VIEWPORT)std::copy(state.viewport,state.viewport+4,out);else glGetIntegerv(p,out);}
const GLubyte* awglGetString(GLenum p){return glGetString(p);}
GLenum awglGetError(){if(errorCode!=GL_NO_ERROR){GLenum e=errorCode;errorCode=GL_NO_ERROR;return e;}GLenum e=glGetError();if(e!=GL_NO_ERROR)EM_ASM({ Module.avenGL=Module.avenGL||{}; Module.avenGL.nativeErrors=(Module.avenGL.nativeErrors||0)+1; });return e;}
void awglReadBuffer(GLenum mode){if(mode==GL_FRONT||mode==GL_BACK)glReadBuffer(GL_BACK);else glReadBuffer(mode);}
void awglReadPixels(GLint x,GLint y,GLsizei w,GLsizei h,GLenum format,GLenum type,GLvoid* data){
    if(format==GL_RGB&&type==GL_UNSIGNED_BYTE){std::vector<GLubyte> rgba(size_t(w)*h*4);glReadPixels(x,y,w,h,GL_RGBA,type,rgba.data());GLint align;glGetIntegerv(GL_PACK_ALIGNMENT,&align);size_t row=(w*3+align-1)/align*align;GLubyte* out=static_cast<GLubyte*>(data);for(int j=0;j<h;++j)for(int i=0;i<w;++i)std::copy_n(&rgba[(size_t(j)*w+i)*4],3,out+j*row+i*3);}
    else glReadPixels(x,y,w,h,format,type,data);
}
#define AW_FORWARD(NAME,DECL,ARGS) void awgl##NAME DECL {if(capture([=]{awgl##NAME ARGS;}))return;gl##NAME ARGS;}
AW_FORWARD(Clear,(GLbitfield mask),(mask))
AW_FORWARD(ClearColor,(GLfloat r,GLfloat g,GLfloat b,GLfloat a),(r,g,b,a))
AW_FORWARD(BlendFunc,(GLenum s,GLenum d),(s,d))
AW_FORWARD(ColorMask,(GLboolean r,GLboolean g,GLboolean b,GLboolean a),(r,g,b,a))
AW_FORWARD(DepthMask,(GLboolean value),(value))
AW_FORWARD(DepthFunc,(GLenum value),(value))
AW_FORWARD(PolygonOffset,(GLfloat factor,GLfloat units),(factor,units))
#undef AW_FORWARD
void awglFlush(){glFlush();}
GLint awgluProject(GLdouble x,GLdouble y,GLdouble z,const GLdouble* m,const GLdouble* p,const GLint* v,GLdouble* ox,GLdouble* oy,GLdouble* oz){return project(x,y,z,m,p,v,ox,oy,oz);}
GLint awgluUnProject(GLdouble x,GLdouble y,GLdouble z,const GLdouble* m,const GLdouble* p,const GLint* v,GLdouble* ox,GLdouble* oy,GLdouble* oz){return unproject(x,y,z,m,p,v,ox,oy,oz);}
void awgluOrtho2D(GLdouble l,GLdouble r,GLdouble b,GLdouble t){awglOrtho(l,r,b,t,-1,1);}
GLUquadric* awgluNewQuadric(){return reinterpret_cast<GLUquadric*>(new unsigned(0));}
void awgluDeleteQuadric(GLUquadric* q){delete reinterpret_cast<unsigned*>(q);}
void awgluPartialDisk(GLUquadric* q,GLdouble inner,GLdouble outer,GLint slices,GLint loops,GLdouble start,GLdouble sweep){
    if(!q||slices<2||loops<1||inner<0||outer<=inner){error(GL_INVALID_VALUE,"quadric disk dimensions");return;}
    sweep=std::max(-360.0,std::min(360.0,sweep));
    const double rad=3.14159265358979323846/180;
    awglBegin(GL_QUADS);
    for(int ring=0;ring<loops;++ring){double a=inner+(outer-inner)*ring/loops,b=inner+(outer-inner)*(ring+1)/loops;
        for(int i=0;i<slices;++i){double t=(start+sweep*i/slices)*rad,u=(start+sweep*(i+1)/slices)*rad;
            awglVertex3d(a*std::sin(t),a*std::cos(t),0);awglVertex3d(b*std::sin(t),b*std::cos(t),0);
            awglVertex3d(b*std::sin(u),b*std::cos(u),0);awglVertex3d(a*std::sin(u),a*std::cos(u),0);}}
    awglEnd();
}
void awgluDisk(GLUquadric* q,GLdouble inner,GLdouble outer,GLint slices,GLint loops){awgluPartialDisk(q,inner,outer,slices,loops,0,360);}
GLint awgluBuild2DMipmaps(GLenum target,GLint internal,GLsizei w,GLsizei h,GLenum format,GLenum type,const void* pixels){awglTexImage2D(target,0,internal,w,h,0,format,type,pixels);glGenerateMipmap(target);return 0;}
#endif
