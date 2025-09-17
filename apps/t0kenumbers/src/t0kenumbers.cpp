#include "t0kenumbers.hpp"
#include <cstdio>

Token::Token(const std::string& name, double price, double supply, double premine_percent)
: name_(name),
  price_(price),
  supply_(supply),
  premine_percent_(premine_percent),
  premine_amount_(0.0),
  last_set_by_amount_(false) {}

const std::string& Token::get_name() const { return name_; }
void Token::set_name(const std::string& n) { name_ = n; }

double Token::get_price() const { return price_; }
void Token::set_price(double p) { price_ = (p >= 0.0 ? p : 0.0); }

double Token::get_supply() const { return supply_; }
void Token::set_supply(double s) { supply_ = (s >= 0.0 ? s : 0.0); }

double Token::get_premine_percent() const { return premine_percent_; }
void Token::set_premine_percent(double pct) {
    if (pct < 0.0) pct = 0.0;
    premine_percent_ = pct;
    last_set_by_amount_ = false;
}

double Token::get_premine_amount() const { return premine_amount_; }
void Token::set_premine_amount(double amt) {
    if (amt < 0.0) amt = 0.0;
    premine_amount_ = amt;
    last_set_by_amount_ = true;
}

double Token::calc_premine_amount() const {
    if (last_set_by_amount_) return premine_amount_;
    return supply_ > 0.0 ? supply_ * (premine_percent_ / 100.0) : 0.0;
}

void Token::print_info() const {
    std::printf("Token{name=\"%s\", price=%.12g, supply=%.12g, prem%%=%.6f, prem_amt=%.12g}\n",
                name_.c_str(), price_, supply_, premine_percent_, calc_premine_amount());
}
