#include <iostream>
#include <iomanip>
#include <string>
#include <optional>
#include <limits>
#include <vector>
#include <algorithm>
#include "t0kenumbers.hpp"

//dont mind
std::optional<double> read_optional_double(const std::string& prompt) {
    std::cout << prompt;
    std::string line;
    std::getline(std::cin, line);
    if (line.empty()) return std::nullopt;
    try {
        size_t idx = 0;
        double v = std::stod(line, &idx);
        return v;
    } catch (...) {
        return std::nullopt;
    }
}

int main() {
    std::cout.setf(std::ios::fixed);
    std::cout.precision(2);

        //bags
    std::vector<Token> tokens;

    while (true) {
        std::cout << "\n1) next\n2) tokens\n3) bored\n4) play\n5) mcap\n0) quit\nchoice: ";
        int choice;
        std::cin >> choice;
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');

        if (choice == 0) break;

        if (choice == 1) {
            std::string name;
            std::cout << "name: ";
            std::getline(std::cin, name);

            auto price_opt  = read_optional_double("price ");
            auto supply_opt = read_optional_double("supply ");
            auto mcap_opt   = read_optional_double("mcap ");

            auto premine_pct_opt   = read_optional_double("premine % ");
            std::optional<double> premine_amount_opt;
            if (!premine_pct_opt) {
                premine_amount_opt = read_optional_double("premine amount ");
            }

            std::optional<double> price = price_opt;
            std::optional<double> supply = supply_opt;
            std::optional<double> mcap = mcap_opt;

            int filled = (price.has_value() ? 1 : 0)
                       + (supply.has_value() ? 1 : 0)
                       + (mcap.has_value() ? 1 : 0);

            if (filled != 2) {
                std::cout << "just fill one (price/supply/mcap).\n";
                continue;
            }

            if (price && supply && !mcap) {
                mcap = (*price) * (*supply);
            } else if (mcap && supply && !price) {
                if (*supply == 0.0) { std::cout << "no 0 suply.\n"; continue; }
                price = (*mcap) / (*supply);
            } else if (mcap && price && !supply) {
                if (*price == 0.0) { std::cout << "no 0 price.\n"; continue; }
                supply = (*mcap) / (*price);
            } else {
                std::cout << "wdym.\n";
                continue;
            }

            double final_price  = price.value();
            double final_supply = supply.value();

            Token token(name, final_price, final_supply, 0.0);

            if (premine_pct_opt && *premine_pct_opt >= 0.0) {
                token.set_premine_percent(*premine_pct_opt);
            } else if (premine_amount_opt && *premine_amount_opt >= 0.0) {
                token.set_premine_amount(*premine_amount_opt);
            }

            tokens.push_back(token);
            std::cout << "token added.\n";
        }

        else if (choice == 2) { // list //new
            if (tokens.empty()) {
                std::cout << "no tokens.\n";
            } else {
                for (size_t i = 0; i < tokens.size(); ++i) {
                    std::cout << i << ": ";
                    tokens[i].print_info();
                }
            }
        }

        else if (choice == 3) {
            std::string delname;
            std::cout << "token name to delete: ";
            std::getline(std::cin, delname);
            auto it = std::remove_if(tokens.begin(), tokens.end(),
                                     [&](const Token& t){ return t.get_name() == delname; });
            if (it != tokens.end()) {
                tokens.erase(it, tokens.end());
                std::cout << "deleted.\n";
            } else {
                std::cout << "not found.\n";
            }
        }

        else if (choice == 4) {
            if (tokens.empty()) { std::cout << "no tokens.\n"; continue; }

            std::string editname;
            std::cout << "token name to edit: ";
            std::getline(std::cin, editname);

            auto it = std::find_if(tokens.begin(), tokens.end(),
                                   [&](const Token& t){ return t.get_name() == editname; });
            if (it == tokens.end()) { std::cout << "not found.\n"; continue; }

            std::cout << "current -> ";
            it->print_info();

            auto price_opt  = read_optional_double("new price (blank = keep): ");
            auto supply_opt = read_optional_double("new supply (blank = keep): ");
            auto mcap_opt   = read_optional_double("new mcap   (blank = keep): ");

            auto premine_pct_opt   = read_optional_double("new premine % (blank = skip): ");
            std::optional<double> premine_amount_opt;
            if (!premine_pct_opt) {
                premine_amount_opt = read_optional_double("new premine amount (blank = skip): ");
            }

            std::optional<double> price = price_opt.has_value() ? price_opt : std::optional<double>(it->get_price());
            std::optional<double> supply = supply_opt.has_value() ? supply_opt : std::optional<double>(it->get_supply());
            std::optional<double> mcap = mcap_opt; // mcap sadece girişten gelir //new

            int filled = (price.has_value() ? 1 : 0)
                       + (supply.has_value() ? 1 : 0)
                       + (mcap.has_value() ? 1 : 0);

            if (filled != 2) {
                std::cout << "need exactly two of price/supply/mcap (after applying keep/blank).\n";
                continue;
            }

            if (price && supply && !mcap) {
                mcap = (*price) * (*supply);
            } else if (mcap && supply && !price) {
                if (*supply == 0.0) { std::cout << "no 0 suply.\n"; continue; }
                price = (*mcap) / (*supply);
            } else if (mcap && price && !supply) {
                if (*price == 0.0) { std::cout << "no 0 price.\n"; continue; }
                supply = (*mcap) / (*price);
            } else {
                std::cout << "wdym.\n";
                continue;
            }

            it->set_price(price.value());
            it->set_supply(supply.value());

            if (premine_pct_opt && *premine_pct_opt >= 0.0) {
                it->set_premine_percent(*premine_pct_opt);
            } else if (premine_amount_opt && *premine_amount_opt >= 0.0) {
                it->set_premine_amount(*premine_amount_opt);
            }

            std::cout << "updated -> ";
            it->print_info();
        }

        else if (choice == 5) { 
            if (tokens.empty()) {
                std::cout << "no tokens.\n";
            } else {
                double total = 0.0;
                for (const auto& t : tokens) total += t.calc_mcap();
                std::cout << "total mcap: " << total << "\n";
            }
        }
    }

    return 0;
}
