#pragma once
#include <string>
#include <cstdio>

class Token {
    std::string name_;
    double price_ = 0.0;
    double supply_ = 0.0;          // circulating (normal)
    double premine_pct_ = 0.0;     // %
    double premine_amt_ = 0.0;     // absolute
public:
    Token(std::string name="", double price=0.0, double supply=0.0, double premine_pct=0.0)
    : name_(std::move(name)), price_(price), supply_(supply), premine_pct_(premine_pct) {}

    const std::string& get_name() const { return name_; }
    void set_name(const std::string& n) { name_ = n; }

    double get_price() const { return price_; }
    void set_price(double p) { price_ = p; }

    double get_supply() const { return supply_; }
    void set_supply(double s) { supply_ = s; }

    double get_premine_percent() const { return premine_pct_; }
    void set_premine_percent(double p) { premine_pct_ = p; }

    double get_premine_amount() const { return premine_amt_; }
    void set_premine_amount(double a)  { premine_amt_ = a; }

    double calc_premine_amount() const {
        if (premine_amt_ > 0.0) return premine_amt_;
        return (supply_ > 0.0) ? (supply_ * (premine_pct_ / 100.0)) : 0.0;
    }

    void print_info() const {
        std::printf("[Token] name=%s price=%g supply=%g prem%%=%g premAmt=%g\n",
                    name_.c_str(), price_, supply_, premine_pct_, premine_amt_);
    }
};
