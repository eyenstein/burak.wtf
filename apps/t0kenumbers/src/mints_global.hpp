#pragma once
#include <vector>
#include <string>

struct MintSpec {
    char   label[128];
    double price;
    double base_supply;
    bool   premine_on;
    double premine_percent; // %
    double premine_amount;  // absolute
    double amount_per_mint;
    int    times;

    MintSpec();
};

struct MintsGlobal {
    std::vector<MintSpec> items;
    void add_default();
    void clear();
};
