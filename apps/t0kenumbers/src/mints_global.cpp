#include "mints_global.hpp"
#include <cstdio>
#include <cstring>

MintSpec::MintSpec() {
    std::snprintf(label, sizeof(label), "%s", "mint");
    price = 0.0;
    base_supply = 0.0;
    premine_on = false;
    premine_percent = 0.0;
    premine_amount = 0.0;
    amount_per_mint = 0.0;
    times = 0;
}

void MintsGlobal::add_default() {
    MintSpec m;
    items.push_back(m);
}

void MintsGlobal::clear() {
    items.clear();
}
