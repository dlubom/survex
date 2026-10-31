// Link native Aven objects; compile aven.cc with -Dmain=aven_application_main.
// Exercise the actual GfxCore/GLACanvas and wheel handler without painting.
// SPDX-License-Identifier: GPL-2.0-or-later
#include <config.h>
#include "aven.h"
#include "gfxcore.h"
#include "guicontrol.h"
#include <wx/fileconf.h>
#include <wx/uilocale.h>
#include <wx/sstream.h>
#include <cmath>
#include <cstdio>

static int failures = 0;
static void near(double actual, double expected, const char* description)
{
    if (std::abs(actual - expected) > 1e-10 * std::max(1.0, std::abs(expected))) {
        std::fprintf(stderr, "FAIL %s: got %.17g, expected %.17g\n",
                     description, actual, expected);
        ++failures;
    }
}
int main(int argc, char** argv)
{
    if (!wxEntryStart(argc, argv)) return 2;
    wxUILocale::UseDefault();
    // In-memory preferences; do not alter the user's native Aven settings.
    wxStringInputStream settings("");
    wxConfigBase::Set(new wxFileConfig(settings));
    auto* frame = new wxFrame(nullptr, wxID_ANY, "Aven scale regression");
    GUIControl control;
    auto* view = new GfxCore(nullptr, frame, &control);
    control.SetView(view);
    view->SetVolumeDiameter(100);
    view->SetScale(2);
    near(view->GetVolumeDiameter() / view->GetScale(), 50, "initial survey width");
    view->SetVolumeDiameter(5400);
    near(view->GetVolumeDiameter() / view->GetScale(), 50,
         "DEM attachment preserves survey width");
    near(view->SurveyUnitsAcrossViewport(), 50, "renderer retains survey width after DEM");
    wxMouseEvent wheel(wxEVT_MOUSEWHEEL);
    wheel.m_wheelRotation = -120;
    control.OnMouseWheel(wheel);
    const double wheel_factor = std::pow(1.06, 4.8);
    near(view->GetVolumeDiameter() / view->GetScale(), 50 / wheel_factor,
         "first wheel after DEM is incremental");
    near(view->SurveyUnitsAcrossViewport(), 50 / wheel_factor,
         "renderer wheel zoom uses the current scale");
    view->SetVolumeDiameter(100);
    near(view->GetVolumeDiameter() / view->GetScale(), 50 / wheel_factor,
         "smaller volume preserves survey width");
    wheel.m_wheelRotation = 120;
    control.OnMouseWheel(wheel);
    near(view->GetVolumeDiameter() / view->GetScale(), 50,
         "opposite wheel restores survey width");
    view->SetScale(0);
    near(view->GetScale(), .05, "lower zoom bound");
    view->SetScale(1000);
    near(view->GetScale(), 100, "upper zoom bound");
    delete frame;
    wxEntryCleanup();
    if (!failures)
        std::puts("PASS: actual Aven volume rescaling, first wheel, reverse wheel and zoom bounds");
    return failures ? 1 : 0;
}
