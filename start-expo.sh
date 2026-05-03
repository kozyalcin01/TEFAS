#!/bin/bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 20

cd /Users/kozyalcin/Desktop/Claude/TEFAS/tefas-portfolio
/Users/kozyalcin/.nvm/versions/node/v20.20.2/bin/npx expo start
