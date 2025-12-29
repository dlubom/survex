/* vrml.cc
 * Export from Aven as VRML.
 */

/* Copyright (C) 2025 Olly Betts
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA
 */

#include <config.h>

#include "vrml.h"

#include "export.h"

#include <wx/config.h>

#include <algorithm>
#include <stdio.h>

struct ThresholdColourScheme {
    double newer_r, newer_g, newer_b;
    double older_r, older_g, older_b;
};

static const ThresholdColourScheme threshold_colour_schemes[] = {
    {1.0, 0.2, 0.2, 0.2, 0.2, 1.0},
    {0.2, 0.8, 0.2, 0.5, 0.5, 0.5},
    {1.0, 0.8, 0.0, 0.5, 0.0, 0.8},
    {1.0, 0.5, 0.0, 0.0, 0.6, 0.8},
};

static const int NUM_THRESHOLD_COLOUR_SCHEMES =
    sizeof(threshold_colour_schemes) / sizeof(threshold_colour_schemes[0]);

static void
vrml_escape(FILE *fh, const char *s)
{
    while (*s) {
	if (*s == '"' || *s == '\\') {
	    PUTC('\\', fh);
	}
	PUTC(*s, fh);
	++s;
    }
}

VRML::VRML()
{
    wxConfigBase* cfg = wxConfigBase::Get();
    if (cfg) {
	cfg->Read(wxT("date_threshold"), &date_threshold, 0);
	cfg->Read(wxT("date_threshold_scheme"), &date_threshold_scheme, 0);
    }
    date_threshold_scheme = std::clamp(date_threshold_scheme, 0,
					  NUM_THRESHOLD_COLOUR_SCHEMES - 1);
}

const int *
VRML::passes() const
{
    static const int default_passes[] = { LEGS|SURF|SPLAYS, 0 };
    return default_passes;
}

void
VRML::header(const char * title, time_t,
	     double, double, double, double, double, double)
{
    fputs("#VRML V2.0 utf8\n", fh);
    fputs("WorldInfo { title \"", fh);
    if (title) {
	vrml_escape(fh, title);
    }
    fputs("\" }\n", fh);
    fputs("NavigationInfo { type [\"EXAMINE\", \"ANY\"] }\n", fh);
}

void
VRML::set_leg_date(int date)
{
    current_date = date;
}

void
VRML::line(const img_point *p1, const img_point *p, unsigned, bool)
{
    const ThresholdColourScheme& scheme =
	threshold_colour_schemes[date_threshold_scheme];
    const bool is_newer = (current_date >= date_threshold &&
				   current_date != -1);
    const double r = is_newer ? scheme.newer_r : scheme.older_r;
    const double g = is_newer ? scheme.newer_g : scheme.older_g;
    const double b = is_newer ? scheme.newer_b : scheme.older_b;

    fprintf(fh,
	    "Shape {\n"
	    "  appearance Appearance {\n"
	    "    material Material { emissiveColor %.3f %.3f %.3f }\n"
	    "  }\n"
	    "  geometry IndexedLineSet {\n"
	    "    coord Coordinate {\n"
	    "      point [ %.3f %.3f %.3f, %.3f %.3f %.3f ]\n"
	    "    }\n"
	    "    coordIndex [ 0, 1, -1 ]\n"
	    "  }\n"
	    "}\n",
	    r, g, b,
	    p1->x, p1->y, p1->z,
	    p->x, p->y, p->z);
}

void
VRML::label(const img_point *, const wxString&, int, int)
{
}

void
VRML::footer()
{
}
