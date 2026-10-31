#include <wx/wx.h>
#include <cstdio>
int main() {
 std::fprintf(stderr, "wxConvFileName before wxEntry: %p\n", (void*)wxConvFileName);
#ifdef SAFE_ACCESSOR
 wxWCharBuffer converted(wxConvFile.cMB2WX("aven"));
#else
 wxWCharBuffer converted(wxConvFileName->cMB2WX("aven"));
#endif
 return converted ? 0 : 2;
}
