//  log.cc - Error log window for Aven.
//
//  Copyright (C) 2006,2011,2014 Olly Betts
//
//  This program is free software; you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation; either version 2 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program; if not, see
//  <https://www.gnu.org/licenses/>.
//

#include <config.h>

#include "aven.h"
#include "log.h"
#include "gla.h"

#ifdef __EMSCRIPTEN__
# include <emscripten.h>
#endif

MyLogWindow::MyLogWindow()
    /* TRANSLATORS: %s will be replaced by the application name ("Aven"
     * currently) */
    : wxLogWindow(NULL,
		  wxString::Format(wmsg(/*%s Error Log*/228), APP_NAME).c_str(),
		  false, false)
{
}

void MyLogWindow::DoLogText(const wxString & msg) {
    if (first) {
	wxLogWindow::DoLogText(wxString(GetGLSystemDescription().c_str(), wxConvUTF8));
	first = false;
    }
    wxLogWindow::DoLogText(msg);
    Show();
}

#ifdef __EMSCRIPTEN__
void MyLogWindow::DoLogTextAtLevel(wxLogLevel level, const wxString& msg)
{
    // stderr is always console.error in the shell. Preserve the actual wx
    // severity instead, so e.g. EndModal debug messages are not false errors.
    EM_ASM({
        const message = UTF8ToString($1);
        if ($0 <= $2) console.error(message);
        else if ($0 === $3) console.warn(message);
        else if ($0 === $4 || $0 === $5) console.debug(message);
        else console.info(message);
    }, level, msg.utf8_str().data(), wxLOG_Error, wxLOG_Warning,
       wxLOG_Debug, wxLOG_Trace);
    wxLogWindow::DoLogTextAtLevel(level, msg);
    if (level <= wxLOG_Warning) Show();
}
#endif
