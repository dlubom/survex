// Aven's deliberately scoped fixed-function facade for WebGL2.
// Copyright (C) 2026. GPL-2.0-or-later, like the surrounding Aven code.
#ifndef AVEN_WEBGL_H
#define AVEN_WEBGL_H
#ifdef __EMSCRIPTEN__
#include <GL/gl.h>
#include <GL/glu.h>
void awglAlphaFunc(GLenum, GLfloat);
void awglBegin(GLenum);
void awglBindTexture(GLenum, GLuint);
void awglBitmap(GLsizei, GLsizei, GLfloat, GLfloat, GLfloat, GLfloat, const GLubyte*);
void awglBlendFunc(GLenum, GLenum);
void awglCallList(GLuint);
void awglCallLists(GLsizei, GLenum, const GLvoid*);
void awglClear(GLbitfield);
void awglClearColor(GLfloat, GLfloat, GLfloat, GLfloat);
void awglColor3ubv(const GLubyte*);
void awglColor4d(GLdouble, GLdouble, GLdouble, GLdouble);
void awglColor4f(GLfloat, GLfloat, GLfloat, GLfloat);
void awglColor4ub(GLubyte, GLubyte, GLubyte, GLubyte);
void awglColorMask(GLboolean, GLboolean, GLboolean, GLboolean);
void awglColorMaterial(GLenum, GLenum);
void awglDeleteLists(GLuint, GLsizei);
void awglDepthFunc(GLenum);
void awglDepthMask(GLboolean);
void awglDisable(GLenum);
void awglEnable(GLenum);
void awglEnd();
void awglEndList();
void awglFlush();
void awglFogf(GLenum, GLfloat);
void awglFogfv(GLenum, const GLfloat*);
void awglFogi(GLenum, GLint);
void awglFrustum(GLdouble, GLdouble, GLdouble, GLdouble, GLdouble, GLdouble);
GLuint awglGenLists(GLsizei);
void awglGenTextures(GLsizei, GLuint*);
void awglGetDoublev(GLenum, GLdouble*);
GLenum awglGetError();
void awglGetFloatv(GLenum, GLfloat*);
void awglGetIntegerv(GLenum, GLint*);
const GLubyte* awglGetString(GLenum);
void awglHint(GLenum, GLenum);
void awglLightfv(GLenum, GLenum, const GLfloat*);
void awglLineStipple(GLint, GLushort);
void awglListBase(GLuint);
void awglLoadIdentity();
void awglMaterialf(GLenum, GLenum, GLfloat);
void awglMaterialfv(GLenum, GLenum, const GLfloat*);
void awglMatrixMode(GLenum);
void awglNewList(GLuint, GLenum);
void awglNormal3d(GLdouble, GLdouble, GLdouble);
void awglOrtho(GLdouble, GLdouble, GLdouble, GLdouble, GLdouble, GLdouble);
void awglPixelStorei(GLenum, GLint);
void awglPointSize(GLfloat);
void awglPolygonMode(GLenum, GLenum);
void awglPolygonOffset(GLfloat, GLfloat);
void awglPopAttrib();
void awglPopMatrix();
void awglPushAttrib(GLbitfield);
void awglPushMatrix();
void awglRasterPos2d(GLdouble, GLdouble);
void awglRasterPos3d(GLdouble, GLdouble, GLdouble);
void awglReadBuffer(GLenum);
void awglReadPixels(GLint, GLint, GLsizei, GLsizei, GLenum, GLenum, GLvoid*);
void awglRotated(GLdouble, GLdouble, GLdouble, GLdouble);
void awglScaled(GLdouble, GLdouble, GLdouble);
void awglShadeModel(GLenum);
void awglTexCoord2f(GLfloat, GLfloat);
void awglTexEnvi(GLenum, GLenum, GLint);
void awglTexImage2D(GLenum, GLint, GLint, GLsizei, GLsizei, GLint, GLenum, GLenum, const GLvoid*);
void awglTexParameteri(GLenum, GLenum, GLint);
void awglTranslated(GLdouble, GLdouble, GLdouble);
void awglVertex3d(GLdouble, GLdouble, GLdouble);
void awglViewport(GLint, GLint, GLsizei, GLsizei);
GLint awgluBuild2DMipmaps(GLenum, GLint, GLsizei, GLsizei, GLenum, GLenum, const void*);
void awgluDeleteQuadric(GLUquadric*);
void awgluDisk(GLUquadric*, GLdouble, GLdouble, GLint, GLint);
GLUquadric* awgluNewQuadric();
void awgluOrtho2D(GLdouble, GLdouble, GLdouble, GLdouble);
void awgluPartialDisk(GLUquadric*, GLdouble, GLdouble, GLint, GLint, GLdouble, GLdouble);
GLint awgluProject(GLdouble, GLdouble, GLdouble, const GLdouble*, const GLdouble*, const GLint*, GLdouble*, GLdouble*, GLdouble*);
GLint awgluUnProject(GLdouble, GLdouble, GLdouble, const GLdouble*, const GLdouble*, const GLint*, GLdouble*, GLdouble*, GLdouble*);

#ifndef AVEN_WEBGL_IMPLEMENTATION
#define glAlphaFunc awglAlphaFunc
#define glBegin awglBegin
#define glBindTexture awglBindTexture
#define glBitmap awglBitmap
#define glBlendFunc awglBlendFunc
#define glCallList awglCallList
#define glCallLists awglCallLists
#define glClear awglClear
#define glClearColor awglClearColor
#define glColor3ubv awglColor3ubv
#define glColor4d awglColor4d
#define glColor4f awglColor4f
#define glColor4ub awglColor4ub
#define glColorMask awglColorMask
#define glColorMaterial awglColorMaterial
#define glDeleteLists awglDeleteLists
#define glDepthFunc awglDepthFunc
#define glDepthMask awglDepthMask
#define glDisable awglDisable
#define glEnable awglEnable
#define glEnd awglEnd
#define glEndList awglEndList
#define glFlush awglFlush
#define glFogf awglFogf
#define glFogfv awglFogfv
#define glFogi awglFogi
#define glFrustum awglFrustum
#define glGenLists awglGenLists
#define glGenTextures awglGenTextures
#define glGetDoublev awglGetDoublev
#define glGetError awglGetError
#define glGetFloatv awglGetFloatv
#define glGetIntegerv awglGetIntegerv
#define glGetString awglGetString
#define glHint awglHint
#define glLightfv awglLightfv
#define glLineStipple awglLineStipple
#define glListBase awglListBase
#define glLoadIdentity awglLoadIdentity
#define glMaterialf awglMaterialf
#define glMaterialfv awglMaterialfv
#define glMatrixMode awglMatrixMode
#define glNewList awglNewList
#define glNormal3d awglNormal3d
#define glOrtho awglOrtho
#define glPixelStorei awglPixelStorei
#define glPointSize awglPointSize
#define glPolygonMode awglPolygonMode
#define glPolygonOffset awglPolygonOffset
#define glPopAttrib awglPopAttrib
#define glPopMatrix awglPopMatrix
#define glPushAttrib awglPushAttrib
#define glPushMatrix awglPushMatrix
#define glRasterPos2d awglRasterPos2d
#define glRasterPos3d awglRasterPos3d
#define glReadBuffer awglReadBuffer
#define glReadPixels awglReadPixels
#define glRotated awglRotated
#define glScaled awglScaled
#define glShadeModel awglShadeModel
#define glTexCoord2f awglTexCoord2f
#define glTexEnvi awglTexEnvi
#define glTexImage2D awglTexImage2D
#define glTexParameteri awglTexParameteri
#define glTranslated awglTranslated
#define glVertex3d awglVertex3d
#define glViewport awglViewport
#define gluBuild2DMipmaps awgluBuild2DMipmaps
#define gluDeleteQuadric awgluDeleteQuadric
#define gluDisk awgluDisk
#define gluNewQuadric awgluNewQuadric
#define gluOrtho2D awgluOrtho2D
#define gluPartialDisk awgluPartialDisk
#define gluProject awgluProject
#define gluUnProject awgluUnProject
#endif
#endif
#endif
