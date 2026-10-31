// SPDX-License-Identifier: GPL-2.0-or-later
// Standalone white-box adapter regression. GL calls terminate in an inspecting
// CPU sink: this verifies display-list storage/replay, not browser rasterisation.
#include <cassert>
#include <cstdint>
#include <cstdio>
#include <malloc.h>
#include "../../src/aven-webgl.cc"
namespace {
const Vertex* uploaded=nullptr;
size_t uploadedCount=0,drawCalls=0,maxUpload=0;
float submittedModel[16];
std::function<void(GLenum,const Vertex*,size_t)> inspect;
void resetSink(){drawCalls=0;maxUpload=0;inspect={};}
void triangle(){awglVertex3d(0,0,0);awglVertex3d(.5,0,0);awglVertex3d(0,.5,0);}
}
extern "C" {
void glUseProgram(GLuint){}
void glBindVertexArray(GLuint){}
void glBindBuffer(GLenum,GLuint){}
void glBufferData(GLenum,GLsizeiptr size,const void* data,GLenum){
    assert(size%sizeof(Vertex)==0);uploaded=static_cast<const Vertex*>(data);
    uploadedCount=size/sizeof(Vertex);maxUpload=std::max(maxUpload,uploadedCount);
}
void glEnableVertexAttribArray(GLuint){}
void glVertexAttribPointer(GLuint,GLint,GLenum,GLboolean,GLsizei,const void*){}
GLint glGetUniformLocation(GLuint,const GLchar* name){return std::strcmp(name,"modelview")==0?1:0;}
void glUniformMatrix4fv(GLint location,GLsizei,GLboolean,const GLfloat* v){if(location==1)std::copy(v,v+16,submittedModel);}
void glUniformMatrix3fv(GLint,GLsizei,GLboolean,const GLfloat*){}
void glUniform1f(GLint,GLfloat){}
void glUniform1i(GLint,GLint){}
void glUniform1ui(GLint,GLuint){}
void glUniform4fv(GLint,GLsizei,const GLfloat*){}
void glActiveTexture(GLenum){}
void glBindTexture(GLenum,GLuint){}
void glDrawArrays(GLenum mode,GLint first,GLsizei count){assert(first==0&&size_t(count)==uploadedCount);++drawCalls;if(inspect)inspect(mode,uploaded,count);}
}
int main(){
    static_assert(sizeof(GeometryOp)==20,"compact operations must remain 20 bytes");
    program=buffer=vao=defaultTexture=1;
    state.viewport[2]=state.viewport[3]=100;
    // GL_COMPILE has no state/drawing effects; inherited attributes and model
    // are resolved afresh on every replay.
    awglColor4f(1,0,0,1);awglNewList(1,GL_COMPILE);awglBegin(GL_TRIANGLES);triangle();awglEnd();awglEndList();
    assert(drawCalls==0&&state.colour[0]==1&&state.colour[2]==0);
    awglColor4f(0,0,1,1);awglNormal3d(2,3,4);awglTexCoord2f(.25,.75);awglTranslated(7,8,9);
    inspect=[](GLenum mode,const Vertex* v,size_t n){assert(mode==GL_TRIANGLES&&n==3);for(size_t i=0;i<n;++i){assert(v[i].c[2]==1&&v[i].c[0]==0);assert(v[i].n[0]==2&&v[i].n[2]==4);assert(v[i].uv[0]==.25&&v[i].uv[1]==.75);}assert(submittedModel[12]==7&&submittedModel[14]==9);};
    awglCallList(1);assert(drawCalls==1);model=identity();
    // An opaque nested call breaks the compact block and remains dynamic.
    awglNewList(2,GL_COMPILE);awglColor4f(0,1,0,1);awglVertex3d(.5,0,0);awglEndList();
    awglNewList(3,GL_COMPILE);awglBegin(GL_TRIANGLES);awglVertex3d(0,0,0);awglCallList(2);awglColor4f(1,1,0,1);awglVertex3d(0,.5,0);awglEnd();awglEndList();
    awglNewList(2,GL_COMPILE);awglColor4f(1,0,1,1);awglNormal3d(4,5,6);awglTexCoord2f(.125,.5);awglVertex3d(.5,0,0);awglEndList();
    resetSink();awglColor4f(0,0,1,1);
    inspect=[](GLenum,const Vertex* v,size_t n){assert(n==3);assert(v[0].c[0]==0&&v[0].c[2]==1);assert(v[1].c[0]==1&&v[1].c[1]==0&&v[1].c[2]==1);assert(v[2].c[0]==1&&v[2].c[1]==1&&v[2].c[2]==0);assert(v[1].n[2]==6&&v[2].n[2]==6);assert(v[1].uv[0]==.125&&v[2].uv[1]==.5);};
    awglCallList(3);assert(drawCalls==1&&state.colour[1]==1&&state.normal[2]==6&&state.uv[0]==.125);
    awglShadeModel(GL_FLAT);inspect=[](GLenum,const Vertex* v,size_t n){assert(n==3);for(size_t i=0;i<n;++i)assert(v[i].c[0]==1&&v[i].c[1]==1&&v[i].c[2]==0&&v[i].n[2]==6);};awglCallList(3);awglShadeModel(GL_SMOOTH);
    // Matrix stack commands between geometry chunks keep their order.
    awglNewList(4,GL_COMPILE);awglCallList(1);awglPushMatrix();awglTranslated(11,12,13);awglCallList(1);awglPopMatrix();awglCallList(1);awglEndList();
    resetSink();inspect=[](GLenum,const Vertex*,size_t){assert(submittedModel[12]==(drawCalls==2?11:0));};awglCallList(4);assert(drawCalls==3&&model==identity());
    // Bitmap payloads and nested glCallLists retain raster position/state.
    unpackAlignment=1;const GLubyte bit=0x80,id=0;
    awglNewList(10,GL_COMPILE);awglBitmap(1,1,0,0,2,0,&bit);awglEndList();
    awglNewList(11,GL_COMPILE);awglRasterPos3d(0,0,0);awglCallLists(1,GL_UNSIGNED_BYTE,&id);awglEndList();
    awglListBase(10);resetSink();inspect=[](GLenum mode,const Vertex*,size_t n){assert(mode==GL_TRIANGLES&&n==6);};awglCallList(11);assert(drawCalls==1&&state.raster[0]==52);
    // Triangle streaming also keeps the existing wire and AA conversion.
    awglPolygonMode(GL_FRONT_AND_BACK,GL_LINE);resetSink();
    inspect=[](GLenum mode,const Vertex*,size_t n){assert(mode==GL_LINES&&n==6);};
    awglCallList(1);assert(drawCalls==1);
    awglEnable(GL_LINE_SMOOTH);resetSink();
    inspect=[](GLenum mode,const Vertex*,size_t n){assert(mode==GL_TRIANGLES&&n==18);};
    awglCallList(1);assert(drawCalls==1);awglDisable(GL_LINE_SMOOTH);awglPolygonMode(GL_FRONT_AND_BACK,GL_FILL);
    // Full Kataster-size command stream, twice (depth + colour). The CPU sink
    // checks every vertex and colour rather than merely total draw counts.
    lists.clear();resetSink();
    constexpr size_t triangleCount=2369843;
    const auto before=mallinfo().uordblks;
    awglNewList(20,GL_COMPILE);awglBegin(GL_TRIANGLES);
    for(size_t i=0;i<triangleCount;++i){awglColor4f(float(i%7),.5,.75,1);for(int j=0;j<3;++j)awglVertex3d(i%1000,j,-.5);}
    awglEnd();awglEndList();
    assert(drawCalls==0&&lists[20].size()==(triangleCount*4+geometryBlockSize-1)/geometryBlockSize+2);
    const auto retained=mallinfo().uordblks-before;
    assert(retained<210u*1024*1024);
    size_t seen=0;
    inspect=[&](GLenum mode,const Vertex* v,size_t n){assert(mode==GL_TRIANGLES&&n%3==0&&n<=triangleBatchSize);for(size_t i=0;i<n;++i,++seen){size_t position=seen%(triangleCount*3),t=position/3;assert(v[i].p[0]==float(t%1000)&&v[i].p[1]==float(position%3)&&v[i].p[2]==-.5f);assert(v[i].c[0]==float(t%7)&&v[i].c[1]==.5f&&v[i].c[2]==.75f&&v[i].c[3]==1);}};
    awglCallList(20);awglCallList(20);
    assert(seen==triangleCount*6&&maxUpload==triangleBatchSize&&vertices.empty());
    assert(errorCode==GL_NO_ERROR);
    std::printf("PASS: inherited attributes, nested/redefined lists, matrix ordering, flat shading, bitmap labels, wire/AA; %zu triangles x 2 passes, %zu vertices, %zu draws, max batch %zu, retained heap delta %zu bytes, heap %d bytes\n",triangleCount,seen,drawCalls,maxUpload,retained,EM_ASM_INT({return HEAPU8.length;}));
}
