#include <cstdio>
#define GL_SILENCE_DEPRECATION

#if defined(__EMSCRIPTEN__)
  #include <GLES3/gl3.h>
  #include <emscripten/emscripten.h>
  #define IMGUI_IMPL_OPENGL_ES3 1
#else
  #include <OpenGL/gl3.h>
#endif

#include <GLFW/glfw3.h>
#include <functional>
#include <vector>
#include <string>
#include <algorithm>

#include "imgui.h"
#include "backends/imgui_impl_glfw.h"
#include "backends/imgui_impl_opengl3.h"

#include "t0kenumbers.hpp"
#include "mints_global.hpp"
#include <emscripten/emscripten.h>

#ifdef __EMSCRIPTEN__
extern "C" {

// ImGui şu anda text istiyor mu?
EMSCRIPTEN_KEEPALIVE int imgui_want_text() {
    ImGuiIO& io = ImGui::GetIO();
    return io.WantTextInput ? 1 : 0;
}

// IME'den gelen UTF-8 karakterleri ImGui'ye yolla
EMSCRIPTEN_KEEPALIVE void ime_send(const char* utf8) {
    if (utf8 && *utf8)
        ImGui::GetIO().AddInputCharactersUTF8(utf8);
}

// (opsiyonel) Klavye tipini değiştir: 0=text, 1=numeric, 2=decimal
EMSCRIPTEN_KEEPALIVE void ime_set_mode(int mode) {
    emscripten_run_script(
        mode==1 ? "if(window.IME){IME.setAttribute('inputmode','numeric');}"
      : mode==2 ? "if(window.IME){IME.setAttribute('inputmode','decimal');}"
                : "if(window.IME){IME.setAttribute('inputmode','text');}"
    );
}

} // extern "C"
#endif


// ---- UI section visibility ----
static bool g_show_tokens = true;
static bool g_show_mints  = true;
static bool g_show_about  = false;

// ---- Per-token UI state ----
struct TokenUI {
    Token  data;
    char   name_buf[128]{};
    bool   ui_init = false;
    double normal_supply = 0.0;
    bool   premine_on    = false;
    
    TokenUI(const Token& t) : data(t) {}
    void ensure_init() {
        if (!ui_init) {
            std::snprintf(name_buf, sizeof(name_buf), "%s", data.get_name().c_str());
            normal_supply = data.get_supply();
            ui_init = true;
        }
    }
};

static void glfw_error_callback(int error, const char* desc) {
    std::fprintf(stderr, "GLFW Error %d: %s\n", error, desc);
}

int main() {
    // ---- GLFW + OpenGL ----
    glfwSetErrorCallback(glfw_error_callback);
    if (!glfwInit()) return 1;

#ifndef __EMSCRIPTEN__
    // Desktop OpenGL 3.2 core
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 2);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
  #ifdef __APPLE__
    glfwWindowHint(GLFW_COCOA_RETINA_FRAMEBUFFER, GLFW_TRUE);
  #endif
#endif

    // GLSL: web vs desktop
#if defined(__EMSCRIPTEN__)
    const char* glsl_version = "#version 300 es";
#else
    const char* glsl_version = "#version 150";
#endif

    GLFWwindow* window = glfwCreateWindow(960, 600, "T0KENUMBERS", nullptr, nullptr);
    if (!window) { glfwTerminate(); return 1; }
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1); // vsync

    // ---- ImGui ----
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO(); (void)io;

    ImGui::StyleColorsDark();
    ImGuiStyle& s = ImGui::GetStyle();
    s.FramePadding   = ImVec2(8, 6);
    s.ItemSpacing    = ImVec2(8, 8);
    s.ScrollbarSize  = 18.0f;
    io.ConfigWindowsMoveFromTitleBarOnly = true;
    io.Fonts->AddFontDefault();
    static ImGuiStyle base_style = ImGui::GetStyle();
    static float last_scale = 1.0f;

    ImGui_ImplGlfw_InitForOpenGL(window, true);
    ImGui_ImplOpenGL3_Init(glsl_version);

    // ---- State ----
    std::vector<TokenUI> tokens;
    tokens.emplace_back(Token{"", 0.0, 0.0, 0.0});

    MintsGlobal mints_global;
    if (mints_global.items.empty()) mints_global.add_default();

    // --------- Frame loop ----------
    auto frame = [&]() {
        glfwPollEvents();
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();

        // ---- iOS IME aç/kapat (WantTextInput) ----
        #if defined(__EMSCRIPTEN__)
        {
            static bool prev_want = false;
            bool want = io.WantTextInput;
            if (want && !prev_want) {
                EM_ASM({ if (window.IME && document.activeElement !== window.IME) window.IME.focus(); });
            }
            if (!want && prev_want) {
                EM_ASM({ if (window.IME && document.activeElement === window.IME) window.IME.blur(); });
            }
            prev_want = want;
        }
        #endif

        // ---- Viewport'a göre otomatik ölçek ----
        const float BASE_W = 960.0f;
        const float BASE_H = 600.0f;

        int fb_w = 0, fb_h = 0;
        glfwGetFramebufferSize(window, &fb_w, &fb_h);
        if (fb_w <= 0) fb_w = 1;
        if (fb_h <= 0) fb_h = 1;

        float scale = std::min(fb_w / BASE_W, fb_h / BASE_H);
        scale = std::clamp(scale, 0.6f, 2.5f);

        if (std::abs(scale - last_scale) > 0.01f) {
            ImGui::GetStyle() = base_style;
            ImGui::GetStyle().ScaleAllSizes(scale);
            ImGui::GetIO().FontGlobalScale = scale;
            last_scale = scale;
        }

        // Menu bar
        if (ImGui::BeginMainMenuBar()) {
            if (ImGui::BeginMenu("File")) {
                if (ImGui::MenuItem("+ New Token")) tokens.emplace_back(Token{"",0.0,0.0,0.0});
                if (ImGui::MenuItem("Clear All Tokens")) tokens.clear();
                if (ImGui::MenuItem("Quit")) glfwSetWindowShouldClose(window, true);
                ImGui::EndMenu();
            }
            if (ImGui::BeginMenu("View")) {
                ImGui::MenuItem("Show Tokens", nullptr, &g_show_tokens);
                ImGui::MenuItem("Show Mints",  nullptr, &g_show_mints);
                ImGui::EndMenu();
            }
            if (ImGui::BeginMenu("Help")) {
                ImGui::MenuItem("About", nullptr, &g_show_about);
                ImGui::EndMenu();
            }
            ImGui::EndMainMenuBar();
        }

        if (g_show_about) {
            ImGui::Begin("About", &g_show_about);
            ImGui::TextUnformatted(
                "Tokens & Mints calculators\n"
                "- 2-of-3: price/supply/mcap (FDV)\n"
                "- Premine on/off affects gross supply and FDV\n"
            );
            ImGui::End();
        }

        // ---- Workspace: viewport'u tam kapla ----
        ImGuiViewport* vp = ImGui::GetMainViewport();
        ImGui::SetNextWindowPos(vp->WorkPos);
        ImGui::SetNextWindowSize(vp->WorkSize);

        ImGuiWindowFlags ws_flags =
            ImGuiWindowFlags_NoMove |
            ImGuiWindowFlags_NoResize |
            ImGuiWindowFlags_NoCollapse |
            ImGuiWindowFlags_NoSavedSettings |
            ImGuiWindowFlags_NoBringToFrontOnFocus;

        ImGui::Begin("Workspace", nullptr, ws_flags);

        const ImGuiTreeNodeFlags sectFlags =
            ImGuiTreeNodeFlags_DefaultOpen |
            ImGuiTreeNodeFlags_SpanAvailWidth;

        // ============ TOKENS ============
        if (g_show_tokens) {
            bool open_tokens = ImGui::CollapsingHeader("Tokens", &g_show_tokens, sectFlags);

            if (g_show_tokens && open_tokens) {
                if (ImGui::Button("+ Add token")) tokens.emplace_back(Token{"",0.0,0.0,0.0});
                ImGui::SameLine();
                if (ImGui::Button("Clear all tokens")) tokens.clear();
                ImGui::Separator();

                for (int i = 0; i < (int)tokens.size(); ++i) {
                    ImGui::PushID(i);

                    auto& T = tokens[i];
                    T.ensure_init();

                    bool keep = true;
                    std::string visible = (T.name_buf[0] ? T.name_buf : "(unnamed)");
                    std::string header  = visible + "##token_header_" + std::to_string(i);

                    bool open = ImGui::CollapsingHeader(
                        header.c_str(), &keep,
                        ImGuiTreeNodeFlags_DefaultOpen | ImGuiTreeNodeFlags_SpanAvailWidth
                    );

                    if (!keep) { ImGui::PopID(); tokens.erase(tokens.begin()+i); --i; continue; }

                    if (open) {
                        if (ImGui::InputText("name##tok", T.name_buf, sizeof(T.name_buf)))
                            T.data.set_name(std::string(T.name_buf));

                        double price = T.data.get_price();
                        if (ImGui::InputDouble("price##tok", &price, 0, 0, "%.12g"))
                            T.data.set_price(price);

                        if (ImGui::InputDouble("normal supply (circulating)##tok", &T.normal_supply, 0, 0, "%.12g")) {
                            if (T.normal_supply < 0.0) T.normal_supply = 0.0;
                        }
                        T.data.set_supply(T.normal_supply);

                        ImGui::Checkbox("Enable premine##tok", &T.premine_on);

                        double prem_pct = T.data.get_premine_percent();
                        double prem_amt = T.data.get_premine_amount();

                        if (!T.premine_on) ImGui::BeginDisabled();
                        if (ImGui::InputDouble("premine %%##tok", &prem_pct, 0, 0, "%.6f"))
                            T.data.set_premine_percent(prem_pct);
                        if (ImGui::InputDouble("premine amount##tok", &prem_amt, 0, 0, "%.12g"))
                            T.data.set_premine_amount(prem_amt);
                        if (!T.premine_on) ImGui::EndDisabled();

                        const double premine_add  = T.premine_on ? T.data.calc_premine_amount() : 0.0;
                        const double gross_supply = std::max(0.0, T.normal_supply) + std::max(0.0, premine_add);
                        const double circ_supply  = gross_supply;

                        double fdv_mcap = (gross_supply > 0.0) ? (T.data.get_price() * gross_supply) : 0.0;
                        if (ImGui::InputDouble("MCAP (FDV, uses gross)##tok", &fdv_mcap, 0, 0, "%.12g"))
                            T.data.set_price(gross_supply > 0.0 ? fdv_mcap / gross_supply : 0.0);

                        ImGui::Separator();
                        ImGui::Text("gross supply: %.12g", gross_supply);
                        ImGui::Text("circulating supply: %.12g", circ_supply);
                        if (T.premine_on) {
                            ImGui::Text("premine amount: %.12g", T.data.calc_premine_amount());
                            ImGui::Text("premine %%: %.6f",  T.data.get_premine_percent());
                        }
                        ImGui::Text("circulating MCAP (info): %.12g", T.data.get_price() * circ_supply);

                        if (ImGui::Button("Print to console##tok")) T.data.print_info();
                        ImGui::SameLine();
                        if (ImGui::Button("Duplicate##tok")) tokens.emplace_back(T.data);
                    }

                    ImGui::PopID();
                }
            }
        }

        // ============ MINTS ============
        if (g_show_mints) {
            bool open_mints = ImGui::CollapsingHeader("Mints", &g_show_mints, sectFlags);

            if (g_show_mints && open_mints) {
                if (ImGui::SmallButton("+ add mint")) mints_global.add_default();
                ImGui::SameLine();
                if (ImGui::SmallButton("clear all"))  mints_global.clear();
                ImGui::Separator();

                for (int i = 0; i < (int)mints_global.items.size(); ++i) {
                    ImGui::PushID(i);

                    bool keep = true;
                    std::string header = std::string(mints_global.items[i].label) + "##mint_header_" + std::to_string(i);

                    bool open = ImGui::CollapsingHeader(
                        header.c_str(), &keep,
                        ImGuiTreeNodeFlags_DefaultOpen | ImGuiTreeNodeFlags_SpanAvailWidth
                    );
                    if (!keep) { mints_global.items.erase(mints_global.items.begin()+i); ImGui::PopID(); --i; continue; }

                    if (open) {
                        MintSpec& M = mints_global.items[i];

                        ImGui::InputText("label##mint", M.label, sizeof(M.label));
                        ImGui::InputDouble("price##mint", &M.price, 0, 0, "%.12g");

                        if (ImGui::InputDouble("base supply##mint", &M.base_supply, 0, 0, "%.12g")) {
                            if (M.base_supply < 0.0) M.base_supply = 0.0;
                            M.premine_amount = (M.base_supply > 0.0) ? (M.base_supply * (M.premine_percent / 100.0)) : 0.0;
                        }

                        ImGui::Checkbox("Enable premine##mint", &M.premine_on);
                        if (!M.premine_on) ImGui::BeginDisabled();

                        double pct = M.premine_percent;
                        if (ImGui::InputDouble("premine %%##mint", &pct, 0, 0, "%.6f")) {
                            if (pct < 0.0) pct = 0.0;
                            M.premine_percent = pct;
                            M.premine_amount  = (M.base_supply > 0.0) ? (M.base_supply * (pct / 100.0)) : 0.0;
                        }

                        double amt = M.premine_amount;
                        if (ImGui::InputDouble("premine amount##mint", &amt, 0, 0, "%.12g")) {
                            if (amt < 0.0) amt = 0.0;
                            M.premine_amount  = amt;
                            M.premine_percent = (M.base_supply > 0.0) ? (amt / M.base_supply * 100.0) : 0.0;
                        }
                        if (!M.premine_on) ImGui::EndDisabled();

                        ImGui::Separator();

                        if (ImGui::InputDouble("amount per mint##mint", &M.amount_per_mint, 0, 0, "%.12g"))
                            if (M.amount_per_mint < 0.0) M.amount_per_mint = 0.0;

                        if (ImGui::InputInt("times##mint", &M.times))
                            if (M.times < 0) M.times = 0;

                        const double minted_total = M.amount_per_mint * std::max(0, M.times);
                        const double premine_add  = M.premine_on ? std::max(0.0, M.premine_amount) : 0.0;
                        const double gross        = std::max(0.0, M.base_supply) + premine_add + std::max(0.0, minted_total);
                        const double circ         = gross;

                        double fdv_mcap = (gross > 0.0) ? (M.price * gross) : 0.0;
                        if (ImGui::InputDouble("MCAP (FDV, uses gross)##mint", &fdv_mcap, 0, 0, "%.12g"))
                            M.price = (gross > 0.0) ? (fdv_mcap / gross) : 0.0;

                        ImGui::Separator();
                        ImGui::Text("gross supply: %.12g", gross);
                        ImGui::Text("circulating supply: %.12g", circ);
                        if (M.premine_on) {
                            ImGui::Text("premine amount: %.12g", M.premine_amount);
                            ImGui::Text("premine %%: %.6f",  M.premine_percent);
                        }
                        ImGui::Text("minted total: %.12g", minted_total);
                        ImGui::Text("per-mint %% of supply (info): %.6f %%", (gross>0? M.amount_per_mint/gross*100.0:0.0));
                        ImGui::Text("cumulative %% of supply (info): %.6f %%", (gross>0? minted_total/gross*100.0:0.0));
                        ImGui::Text("circulating MCAP (info): %.12g", M.price * circ);
                    }

                    ImGui::PopID();
                }
            }
        }

        ImGui::End(); // Workspace

        // ---- Render ----
        ImGui::Render();
        int w, h; glfwGetFramebufferSize(window, &w, &h);
        glViewport(0, 0, w, h);
        glClearColor(0.10f, 0.10f, 0.10f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
        glfwSwapBuffers(window);
    };

    // ---- Main loop ----
#if defined(__EMSCRIPTEN__)
    static std::function<void()> g_loop = frame;
    auto em_loop = [](){ g_loop(); };
    emscripten_set_main_loop(em_loop, 0, true);
#else
    while (!glfwWindowShouldClose(window)) {
        frame();
    }
#endif

    // Shutdown
    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
