#include <proj.h>
#include <sqlite3.h>
#include <cmath>
#include <cstdio>

int main() {
    PJ_CONTEXT* ctx = proj_context_create();
    const char* paths[] = {"/proj"};
    proj_context_set_search_paths(ctx, 1, paths);
    PJ* op = proj_create_crs_to_crs(ctx, "EPSG:4326", "EPSG:2180", nullptr);
    if (!op) return 2;
    PJ* normal = proj_normalize_for_visualization(ctx, op);
    proj_destroy(op);
    if (!normal) return 3;
    PJ_COORD result = proj_trans(normal, PJ_FWD, proj_coord(20, 50, 0, 0));
    PJ_COORD reverse = proj_trans(normal, PJ_INV, result);
    std::printf("PROJ=%s SQLite=%s\n", proj_info().version, sqlite3_libversion());
    std::printf("EPSG:4326 lon=20 lat=50 -> EPSG:2180 E=%.9f N=%.9f\n", result.xy.x, result.xy.y);
    std::printf("inverse lon=%.12f lat=%.12f\n", reverse.lp.lam, reverse.lp.phi);
    bool ok = proj_errno(normal) == 0 && std::isfinite(result.xy.x) &&
        std::isfinite(result.xy.y) &&
        std::fabs(result.xy.x - 571644.938966461) < 0.001 &&
        std::fabs(result.xy.y - 237447.417271958) < 0.001 &&
        std::fabs(reverse.lp.lam - 20) < 1e-9 &&
        std::fabs(reverse.lp.phi - 50) < 1e-9;
    proj_destroy(normal);
    proj_context_destroy(ctx);
    return ok ? 0 : 4;
}
