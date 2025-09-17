#pragma once
#include <string>

class Token {
public:
    Token(const std::string& name = "", double price = 0.0, double supply = 0.0, double premine_percent = 0.0);

    // name
    const std::string& get_name() const;
    void set_name(const std::string& n);

    // price
    double get_price() const;
    void set_price(double p);

    // circulating/normal supply
    double get_supply() const;
    void set_supply(double s);

    // premine (percent/amount)
    double get_premine_percent() const;
    void set_premine_percent(double pct);
    double get_premine_amount() const;
    void set_premine_amount(double amt);

    // derived
    double calc_premine_amount() const;

    // debug
    void print_info() const;

private:
    std::string name_;
    double price_;
    double supply_;
    double premine_percent_;
    double premine_amount_;
    bool   last_set_by_amount_; // true: amount en son set edildi; false: percent geçerli
};
