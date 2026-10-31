// Regression: antialiased segments must be clipped before perspective division.
// SPDX-License-Identifier: GPL-2.0-or-later
#include "../../src/aven-webgl-matrix.h"
#include <cstdio>
#include <cstdlib>
#include <limits>
using namespace aven_webgl;

void check(bool value, const char* message)
{
    if (!value) { std::fprintf(stderr, "FAIL: %s\n", message); std::exit(1); }
}
void interval(const std::array<double,4>& a, const std::array<double,4>& b,
              double expected_first, double expected_last)
{
    double first, last;
    check(clip_segment(a,b,first,last), "visible segment rejected");
    check(std::abs(first-expected_first)<1e-12, "wrong first parameter");
    check(std::abs(last-expected_last)<1e-12, "wrong last parameter");
    for (double t : {first,last}) {
        const double w=a[3]+t*(b[3]-a[3]);
        check(w>0, "perspective division needs positive w");
        for (int axis=0;axis<3;++axis) {
            const double ndc=(a[axis]+t*(b[axis]-a[axis]))/w;
            check(ndc>=-1-1e-12 && ndc<=1+1e-12, "endpoint outside clip volume");
        }
    }
}
int main()
{
    const Matrix p=frustum(-1,1,-1,1,1,10);
    auto clip=[&](double x,double y,double z) {return transform(p,{{x,y,z,1}});};
    // The second endpoint is behind the camera. Near-plane intersection is
    // at z=-1, t=1/3; screen expansion must end there, not at its projection.
    interval(clip(.25,0,-2),clip(-.25,0,1),0,1.0/3);
    interval(clip(-.25,0,1),clip(.25,0,-2),2.0/3,1);
    interval(clip(.25,0,-.5),clip(.25,0,-4),1.0/7,1);
    interval(clip(0,.25,-4),clip(0,.25,-16),0,.5);
    interval(clip(.25,0,-2),clip(-.25,.5,-4),0,1);
    // Exercise both sides of each of the six planes independently.
    for (int axis=0;axis<3;++axis) {
        std::array<double,4> a{{0,0,0,1}},b=a;a[axis]=-2;b[axis]=2;
        interval(a,b,.25,.75);
    }
    double first,last;
    check(!clip_segment(clip(0,0,1),clip(.5,0,2),first,last), "fully behind camera accepted");
    check(!clip_segment({{2,0,0,1}},{{3,0,0,1}},first,last), "outside side plane accepted");
    check(!clip_segment({{0,0,0,0}},{{0,0,0,0}},first,last), "homogeneous origin accepted");
    check(!clip_segment({{0,0,0,1}},{{0,0,std::numeric_limits<double>::infinity(),1}},first,last), "infinite input accepted");
    std::puts("PASS: near/camera/far clipping, six planes, reversed endpoints and invalid inputs");
}
