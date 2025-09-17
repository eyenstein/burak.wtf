//
//  main.cpp
//  deneme
//
//  Created by dalamar argent on 15/09/2025.
//

#include <iostream>


int square(int &i) {
    i=i*i;
    return i;

}

int main() {
  
  int side = 5;
  
  std::cout << square(side) << "\n";
  std::cout << square(side) << "\n";
}
