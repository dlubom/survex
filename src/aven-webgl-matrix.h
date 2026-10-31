// Double-precision CPU transforms for Aven's WebGL renderer.
// Column-major matrices and post-multiplication follow OpenGL conventions.
// SPDX-License-Identifier: GPL-2.0-or-later
#ifndef AVEN_WEBGL_MATRIX_H
#define AVEN_WEBGL_MATRIX_H

#include <array>
#include <algorithm>
#include <cmath>

namespace aven_webgl {

using Matrix = std::array<double, 16>;

inline Matrix identity()
{
    return {{1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1}};
}

inline Matrix multiply(const Matrix& a, const Matrix& b)
{
    Matrix out = {{0}};
    for (unsigned c = 0; c < 4; ++c)
        for (unsigned r = 0; r < 4; ++r)
            for (unsigned k = 0; k < 4; ++k)
                out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return out;
}

inline std::array<double, 4>
transform(const Matrix& m, const std::array<double, 4>& p)
{
    std::array<double, 4> out = {{0}};
    for (unsigned r = 0; r < 4; ++r)
        for (unsigned c = 0; c < 4; ++c)
            out[r] += m[c * 4 + r] * p[c];
    return out;
}

inline bool inverse(const Matrix& in, Matrix& out)
{
    // Gauss-Jordan elimination with partial pivoting. Keep the caller's output
    // untouched for singular inputs, and reject non-finite input/results.
    double rows[4][8];
    for (unsigned r = 0; r < 4; ++r) {
        for (unsigned c = 0; c < 4; ++c) {
            double v = in[c * 4 + r];
            if (!std::isfinite(v)) return false;
            rows[r][c] = v;
            rows[r][c + 4] = r == c ? 1 : 0;
        }
    }
    for (unsigned c = 0; c < 4; ++c) {
        unsigned pivot = c;
        for (unsigned r = c + 1; r < 4; ++r)
            if (std::abs(rows[r][c]) > std::abs(rows[pivot][c])) pivot = r;
        if (rows[pivot][c] == 0) return false;
        if (pivot != c)
            for (unsigned k = 0; k < 8; ++k)
                std::swap(rows[c][k], rows[pivot][k]);
        const double d = rows[c][c];
        for (unsigned k = 0; k < 8; ++k) rows[c][k] /= d;
        for (unsigned r = 0; r < 4; ++r) {
            if (r == c) continue;
            const double factor = rows[r][c];
            for (unsigned k = 0; k < 8; ++k)
                rows[r][k] -= factor * rows[c][k];
        }
    }
    Matrix result;
    for (unsigned r = 0; r < 4; ++r)
        for (unsigned c = 0; c < 4; ++c) {
            double v = rows[r][c + 4];
            if (!std::isfinite(v)) return false;
            result[c * 4 + r] = v;
        }
    out = result;
    return true;
}

inline Matrix translation(double x, double y, double z)
{
    Matrix m = identity();
    m[12] = x; m[13] = y; m[14] = z;
    return m;
}

inline Matrix scale(double x, double y, double z)
{
    Matrix m = identity();
    m[0] = x; m[5] = y; m[10] = z;
    return m;
}

inline Matrix rotation(double angle_deg, double x, double y, double z)
{
    const double length = std::sqrt(x * x + y * y + z * z);
    if (length == 0) return identity();
    x /= length; y /= length; z /= length;
    const double a = angle_deg * (3.14159265358979323846 / 180.0);
    const double c = std::cos(a), s = std::sin(a), t = 1 - c;
    return {{t*x*x+c, t*x*y+s*z, t*x*z-s*y, 0,
             t*x*y-s*z, t*y*y+c, t*y*z+s*x, 0,
             t*x*z+s*y, t*y*z-s*x, t*z*z+c, 0,
             0, 0, 0, 1}};
}

inline Matrix ortho(double l, double r, double b, double t, double n, double f)
{
    Matrix m = identity();
    m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l);
    m[13] = -(t + b) / (t - b);
    m[14] = -(f + n) / (f - n);
    return m;
}

inline Matrix frustum(double l, double r, double b, double t, double n, double f)
{
    Matrix m = {{0}};
    m[0] = 2 * n / (r - l); m[5] = 2 * n / (t - b);
    m[8] = (r + l) / (r - l); m[9] = (t + b) / (t - b);
    m[10] = -(f + n) / (f - n); m[11] = -1;
    m[14] = -2 * f * n / (f - n);
    return m;
}

inline Matrix matrix_from(const double* p)
{
    Matrix m;
    std::copy(p, p + 16, m.begin());
    return m;
}

// Clip a segment against -w <= x,y,z <= w before perspective division.
// The returned parameters also interpolate colours and other vertex attributes.
inline bool clip_segment(const std::array<double, 4>& a,
                         const std::array<double, 4>& b,
                         double& first, double& last)
{
    first = 0;
    last = 1;
    for (unsigned i = 0; i < 4; ++i)
        if (!std::isfinite(a[i]) || !std::isfinite(b[i])) return false;
    for (unsigned axis = 0; axis < 3; ++axis) {
        for (int sign : {-1, 1}) {
            const double fa = a[3] + sign * a[axis];
            const double fb = b[3] + sign * b[axis];
            if (fa < 0 && fb < 0) return false;
            if (fa < 0) first = std::max(first, fa / (fa - fb));
            if (fb < 0) last = std::min(last, fa / (fa - fb));
            if (first > last) return false;
        }
    }
    // The homogeneous origin has no finite projection even though it lies on
    // all six planes. Real perspective near planes produce positive w.
    return a[3] + first * (b[3] - a[3]) > 0 &&
           a[3] + last * (b[3] - a[3]) > 0;
}

inline int project(double x, double y, double z,
                   const double* model, const double* projection,
                   const int* viewport, double* ox, double* oy, double* oz)
{
    const auto p = transform(multiply(matrix_from(projection), matrix_from(model)),
                             {{x, y, z, 1}});
    if (p[3] == 0 || !std::isfinite(p[3])) return 0;
    const double px = viewport[0] + (p[0] / p[3] + 1) * viewport[2] * .5;
    const double py = viewport[1] + (p[1] / p[3] + 1) * viewport[3] * .5;
    const double pz = (p[2] / p[3] + 1) * .5;
    if (!std::isfinite(px) || !std::isfinite(py) || !std::isfinite(pz)) return 0;
    *ox = px; *oy = py; *oz = pz;
    return 1;
}

inline int unproject(double x, double y, double z,
                     const double* model, const double* projection,
                     const int* viewport, double* ox, double* oy, double* oz)
{
    if (viewport[2] == 0 || viewport[3] == 0) return 0;
    Matrix inv;
    if (!inverse(multiply(matrix_from(projection), matrix_from(model)), inv)) return 0;
    const auto p = transform(inv, {{(x - viewport[0]) * 2 / viewport[2] - 1,
                                  (y - viewport[1]) * 2 / viewport[3] - 1,
                                  2 * z - 1, 1}});
    if (p[3] == 0 || !std::isfinite(p[3])) return 0;
    const double px = p[0] / p[3], py = p[1] / p[3], pz = p[2] / p[3];
    if (!std::isfinite(px) || !std::isfinite(py) || !std::isfinite(pz)) return 0;
    *ox = px; *oy = py; *oz = pz;
    return 1;
}

} // namespace aven_webgl
#endif
