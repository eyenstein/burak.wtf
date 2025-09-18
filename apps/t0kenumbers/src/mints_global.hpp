#pragma once
#include <vector>
#include <cstring>

struct MintSpec {
    char   label[64];
    double price = 0.0;
    double base_supply = 0.0;
    bool   premine_on = false;
    double premine_percent = 0.0;   // %
    double premine_amount  = 0.0;   // absolute
    double amount_per_mint = 0.0;
    int    times = 0;

    MintSpec() { std::strncpy(label, "mint", sizeof(label)); label[sizeof(label)-1] = '\0'; }
};

struct MintsGlobal {
    std::vector<MintSpec> items;

    void add_default() {
        MintSpec m;
        std::strncpy(m.label, "mint-1", sizeof(m.label));
        items.push_back(m);
    }
    void clear() { items.clear(); }
};
