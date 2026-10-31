// Diagnostic wxWidgets/WASM application. This is NOT Aven and loads no cave data.
#include <wx/wx.h>
#include <wx/glcanvas.h>
#include <wx/treectrl.h>
#include <wx/sizer.h>
#include <GLES2/gl2.h>
#include <emscripten.h>
#include <emscripten/html5.h>
#include <cstdio>
#include <memory>

class TriangleCanvas final : public wxGLCanvas {
    std::unique_ptr<wxGLContext> context_;
    GLuint program_ = 0;
    GLuint buffer_ = 0;
    bool failed_ = false;
    bool warm_ = false;
    unsigned frames_ = 0;

    GLuint Shader(GLenum type, const char* source) {
        const GLuint shader = glCreateShader(type);
        glShaderSource(shader, 1, &source, nullptr);
        glCompileShader(shader);
        GLint ok = GL_FALSE;
        glGetShaderiv(shader, GL_COMPILE_STATUS, &ok);
        if (!ok) {
            char log[2048] = {};
            glGetShaderInfoLog(shader, sizeof(log), nullptr, log);
            std::fprintf(stderr, "WX_SMOKE_SHADER_FAILURE: %s\n", log);
            glDeleteShader(shader);
            return 0;
        }
        return shader;
    }

    bool InitGL() {
        const char* vertex =
            "attribute vec2 position;\n"
            "attribute vec3 color;\n"
            "varying vec3 vColor;\n"
            "void main(){vColor=color;gl_Position=vec4(position,0.0,1.0);}\n";
        const char* fragment =
            "precision mediump float;\n"
            "varying vec3 vColor;\n"
            "uniform vec3 tint;\n"
            "void main(){gl_FragColor=vec4(vColor*tint,1.0);}\n";
        GLuint vs = Shader(GL_VERTEX_SHADER, vertex);
        GLuint fs = Shader(GL_FRAGMENT_SHADER, fragment);
        if (!vs || !fs) return false;
        program_ = glCreateProgram();
        glAttachShader(program_, vs);
        glAttachShader(program_, fs);
        glBindAttribLocation(program_, 0, "position");
        glBindAttribLocation(program_, 1, "color");
        glLinkProgram(program_);
        glDeleteShader(vs);
        glDeleteShader(fs);
        GLint linked = GL_FALSE;
        glGetProgramiv(program_, GL_LINK_STATUS, &linked);
        if (!linked) {
            char log[2048] = {};
            glGetProgramInfoLog(program_, sizeof(log), nullptr, log);
            std::fprintf(stderr, "WX_SMOKE_LINK_FAILURE: %s\n", log);
            return false;
        }
        const GLfloat vertices[] = {
            -0.80f, -0.65f, 1.0f, 0.15f, 0.15f,
             0.80f, -0.65f, 0.15f, 1.0f, 0.15f,
             0.00f,  0.80f, 0.15f, 0.35f, 1.0f
        };
        glGenBuffers(1, &buffer_);
        glBindBuffer(GL_ARRAY_BUFFER, buffer_);
        glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
        std::printf("WX_SMOKE_GL_INITIALIZED: version=%s renderer=%s\n",
                    glGetString(GL_VERSION), glGetString(GL_RENDERER));
        return true;
    }

    void Paint(wxPaintEvent&) {
        wxPaintDC dc(this);
        if (!IsShownOnScreen() || failed_) return;
        if (!context_->IsOK() || !SetCurrent(*context_)) {
            failed_ = true;
            std::fprintf(stderr, "WX_SMOKE_CONTEXT_FAILURE\n");
            EM_ASM({ globalThis.wxSmoke.error = 'context'; });
            return;
        }
        if (!program_ && !InitGL()) {
            failed_ = true;
            EM_ASM({ globalThis.wxSmoke.error = 'shader-or-link'; });
            return;
        }
        int width = 0, height = 0;
        emscripten_get_canvas_element_size(GetCanvasTarget(), &width, &height);
        if (width <= 0 || height <= 0) return;
        glViewport(0, 0, width, height);
        glClearColor(0.025f, 0.045f, 0.08f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        glUseProgram(program_);
        glUniform3f(glGetUniformLocation(program_, "tint"), 1.0f,
                    warm_ ? 0.55f : 1.0f, warm_ ? 0.25f : 1.0f);
        glBindBuffer(GL_ARRAY_BUFFER, buffer_);
        glEnableVertexAttribArray(0);
        glEnableVertexAttribArray(1);
        glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 5*sizeof(GLfloat), nullptr);
        glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 5*sizeof(GLfloat),
                              reinterpret_cast<void*>(2*sizeof(GLfloat)));
        glDrawArrays(GL_TRIANGLES, 0, 3);
        unsigned char pixel[4] = {};
        glReadPixels(width/2, height/2, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, pixel);
        const GLenum error = glGetError();
        SwapBuffers();
        ++frames_;
        EM_ASM({
            globalThis.wxSmoke.frames=$0;
            globalThis.wxSmoke.size=Array($1,$2);
            globalThis.wxSmoke.centerPixel=Array($3,$4,$5,$6);
            globalThis.wxSmoke.glError=$7;
            globalThis.wxSmoke.warm=!!$8;
        }, frames_, width, height, pixel[0], pixel[1], pixel[2], pixel[3], error, warm_);
        if (frames_ <= 3)
            std::printf("WX_SMOKE_FRAME: n=%u size=%dx%d pixel=%u,%u,%u,%u error=%u\n",
                        frames_, width, height, pixel[0],pixel[1],pixel[2],pixel[3],error);
    }
public:
    explicit TriangleCanvas(wxWindow* parent)
        : wxGLCanvas(parent, wxID_ANY, nullptr, wxDefaultPosition, wxSize(640,440)) {
        context_ = std::make_unique<wxGLContext>(this);
        Bind(wxEVT_PAINT, &TriangleCanvas::Paint, this);
        Bind(wxEVT_SIZE, [this](wxSizeEvent& event){Refresh(false);event.Skip();});
    }
    void SetWarm(bool warm) { warm_ = warm; Refresh(false); }
};

class SmokeApp final : public wxApp {
public:
    bool OnInit() override {
        EM_ASM({globalThis.wxSmoke={};globalThis.wxSmoke.app='wx-toolkit-diagnostic-not-aven';globalThis.wxSmoke.frames=0;globalThis.wxSmoke.selections=0;globalThis.wxSmoke.error=null;});
        auto* frame = new wxFrame(nullptr, wxID_ANY,
            "wxWidgets + WASM diagnostic - NOT Aven", wxDefaultPosition, wxSize(960,640));
        auto* panel = new wxPanel(frame);
        auto* column = new wxBoxSizer(wxVERTICAL);
        auto* title = new wxStaticText(panel, wxID_ANY,
            "TOOLKIT DIAGNOSTIC - NOT AVEN | Real wxFrame + wxTreeCtrl + wxGLCanvas");
        auto* status = new wxStaticText(panel, wxID_ANY,
            "Select a tree item to change the OpenGL triangle colour.");
        auto* row = new wxBoxSizer(wxHORIZONTAL);
        auto* tree = new wxTreeCtrl(panel, wxID_ANY, wxDefaultPosition, wxSize(250,440),
                                   wxTR_HAS_BUTTONS | wxTR_LINES_AT_ROOT | wxTR_SINGLE);
        const auto root = tree->AddRoot("Diagnostic controls");
        const auto rgb = tree->AppendItem(root, "RGB triangle");
        const auto warm = tree->AppendItem(root, "Warm triangle");
        tree->Expand(root);
        auto* canvas = new TriangleCanvas(panel);
        tree->Bind(wxEVT_TREE_SEL_CHANGED, [=](wxTreeEvent& event){
            const bool useWarm = event.GetItem() == warm;
            canvas->SetWarm(useWarm);
            status->SetLabel(useWarm ? "Tree event delivered: warm triangle" : "Tree event delivered: RGB triangle");
            EM_ASM({globalThis.wxSmoke.selections++;});
            std::printf("WX_SMOKE_TREE_SELECTION: warm=%d\n", useWarm);
        });
        row->Add(tree, 0, wxEXPAND | wxRIGHT, 10);
        row->Add(canvas, 1, wxEXPAND);
        column->Add(title, 0, wxALL, 12);
        column->Add(row, 1, wxEXPAND | wxLEFT | wxRIGHT, 12);
        column->Add(status, 0, wxALL, 12);
        panel->SetSizer(column);
        auto* outer = new wxBoxSizer(wxVERTICAL);
        outer->Add(panel, 1, wxEXPAND);
        frame->SetSizer(outer);
        frame->Show();
        frame->Layout();
        canvas->Show();
        canvas->Refresh(false);
        tree->SelectItem(rgb);
        std::printf("WX_SMOKE_APP_CREATED\n");
        return true;
    }
};
wxIMPLEMENT_APP(SmokeApp);
