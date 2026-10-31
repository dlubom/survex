# Run from the native build's src directory with its generated Makefile first:
# make -f Makefile -f /path/to/source/tests/wasm-spike/native-regressions.mk scale-regression
scale-regression-aven.o: $(srcdir)/aven.cc
	$(CXX) $(DEFS) $(DEFAULT_INCLUDES) $(aven_CXXFLAGS) $(CXXFLAGS) -Dmain=aven_application_main -c $< -o $@

scale-regression.o: $(top_srcdir)/tests/wasm-spike/scale-regression.cc $(srcdir)/gfxcore.h $(srcdir)/gla.h
	$(CXX) $(DEFS) $(DEFAULT_INCLUDES) $(aven_CXXFLAGS) $(CXXFLAGS) -c $< -o $@

scale-regression: $(filter-out aven-aven.o,$(aven_OBJECTS)) scale-regression-aven.o scale-regression.o
	$(CXXLINK) $^ $(aven_LDADD) $(LIBS)
