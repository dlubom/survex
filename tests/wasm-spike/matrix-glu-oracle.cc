// Independent native GLU oracle for the WebGL renderer's CPU transforms.
// macOS: clang++ -std=c++11 -Wno-deprecated-declarations matrix-glu-oracle.cc
//          -framework OpenGL -o /tmp/matrix-glu-oracle && /tmp/matrix-glu-oracle
// Linux: c++ -std=c++11 matrix-glu-oracle.cc -lGLU -o /tmp/matrix-glu-oracle
// SPDX-License-Identifier: GPL-2.0-or-later
#include "../../src/aven-webgl-matrix.h"
#ifdef __APPLE__
#include <OpenGL/glu.h>
#else
#include <GL/glu.h>
#endif
#include <cstdio>
#include <cstdlib>

using namespace aven_webgl;

static int checks = 0;
static double largest_project_error = 0, largest_unproject_error = 0;

static double compare(const double* actual, const double* expected,
                      double tolerance, const char* operation)
{
    double largest = 0;
    for (int i = 0; i < 3; ++i) {
        double d = std::abs(actual[i] - expected[i]);
        if (!std::isfinite(d) || d > tolerance) {
            std::fprintf(stderr, "%s axis %d: adapter %.17g, GLU %.17g, error %.17g > %.17g\n",
                         operation, i, actual[i], expected[i], d, tolerance);
            std::exit(1);
        }
        largest = std::max(largest, d);
        ++checks;
    }
    return largest;
}

static void verify(const Matrix& model, const Matrix& projection)
{
    const GLint viewport[] = {31, 47, 1379, 853};
    const double points[][3] = {
        {571644.938966461, 237447.417271959, 1000.0},
        {571654.938966461, 237467.417271959, 960.0},
        {571614.938966461, 237437.417271959, 1020.0}
    };
    for (const auto& point : points) {
        double actual[3], expected[3];
        int a = project(point[0], point[1], point[2], model.data(), projection.data(),
                        viewport, actual, actual + 1, actual + 2);
        int b = gluProject(point[0], point[1], point[2], model.data(), projection.data(),
                           viewport, expected, expected + 1, expected + 2);
        if (a != b || a != GL_TRUE) std::abort();
        largest_project_error = std::max(largest_project_error,
                                        compare(actual, expected, 1e-7, "project"));

        // Feed GLU's output into each independent implementation. This does
        // not permit matching forward/inverse mistakes to cancel each other.
        const double window[3] = {expected[0], expected[1], expected[2]};
        a = unproject(window[0], window[1], window[2], model.data(), projection.data(),
                      viewport, actual, actual + 1, actual + 2);
        b = gluUnProject(window[0], window[1], window[2], model.data(), projection.data(),
                         viewport, expected, expected + 1, expected + 2);
        if (a != b || a != GL_TRUE) std::abort();
        largest_unproject_error = std::max(largest_unproject_error,
                                          compare(actual, expected, 1e-6, "unproject"));
        compare(actual, point, 1e-6, "round trip");
    }

    // Additional arbitrary window positions exercise inverse behaviour away
    // from the previous forward-projected points, including clip boundaries.
    const double windows[][3] = {{31,47,0}, {1410,900,1}, {713.2,372.8,.37}};
    for (const auto& window : windows) {
        double actual[3], expected[3];
        int a = unproject(window[0], window[1], window[2], model.data(), projection.data(),
                          viewport, actual, actual + 1, actual + 2);
        int b = gluUnProject(window[0], window[1], window[2], model.data(), projection.data(),
                             viewport, expected, expected + 1, expected + 2);
        if (a != b || a != GL_TRUE) std::abort();
        largest_unproject_error = std::max(largest_unproject_error,
                                          compare(actual, expected, 1e-6, "window unproject"));
    }
}

int main()
{
    Matrix model = multiply(translation(3, -7, -180),
                   multiply(rotation(-61, 1, 0, 0),
                   multiply(rotation(37, 0, 0, 1),
                   multiply(scale(1.1, .8, 1.3),
                            translation(-571644.938966461, -237447.417271959, -1000)))));
    verify(model, ortho(-110, 130, -70, 90, 1, 1000));
    verify(model, frustum(-1.3, 1.7, -.8, 1.2, 2, 1000));

    // Fully populated, independently specified affine matrix (not constructed
    // via the adapter's rotation/translation helpers).
    model = {{0.8, 0.6, 0, 0, -.48, .64, .6, 0, .36, -.48, .8, 0,
              -343700, -494000, -143500, 1}};
    verify(model, ortho(-150, 170, -110, 120, -500, 600));
    verify(model, frustum(-1, 1.2, -.7, 1.1, 1, 10000));
    std::printf("PASS: %d scalar checks (108 against native GLU, 36 round-trip); max project error %.12g pixels/depth, max unproject error %.12g m\n",
                checks, largest_project_error, largest_unproject_error);
}
