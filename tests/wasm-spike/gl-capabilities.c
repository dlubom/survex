#include <GL/gl.h>
#include <GL/glu.h>
/* Link probe for APIs used by unchanged Aven; no substitutes or stub symbols. */
int main(void) {
    unsigned char pixels[8] = {255, 255, 255, 255, 255, 255, 255, 255};
    GLuint list = glGenLists(1);
    glNewList(list, GL_COMPILE);
    glBegin(GL_LINES);
    glVertex3d(0, 0, 0);
    glVertex3d(1, 1, 1);
    glEnd();
    glEndList();
    glCallList(list);
    glBitmap(8, 8, 0, 0, 8, 0, pixels);
    glLineStipple(1, 0xAAAA);
    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
    glDeleteLists(list, 1);
    return 0;
}
