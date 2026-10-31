# Malformed terrain regression input

`N49E019.hgt` contains exactly three bytes: `00 01 02`. It is a synthetic invalid
input, not elevation data. One complete 16-bit sample plus a dangling byte must
be rejected before reading into a buffer allocated as `size / 2` samples.

Run `../../browser-malformed-hgt-check.js` against a rebuilt bundle. It loads
this file through the existing terrain dialog, requires the odd-byte-count
diagnostic, dismisses it, and then loads the valid synthetic DEM to verify
recovery without console or graphics errors. The existing fixture preload
includes this subdirectory automatically.
