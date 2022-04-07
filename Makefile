SJC_VERSION=0.5.0
SJC_INSTALL=$(HOME)/.bin
SJC=$(SJC_INSTALL)/sjc

test: testsetup testrun

testsetup: $(SJC)
	rm -f storage.json
	sjc run ./sdk/helpers.ts fund acc:GA # Asset Issuer A
	sjc run ./sdk/helpers.ts fund acc:GB # Asset Issuer B
	sjc run ./sdk/helpers.ts fund acc:GP # Pool account
	sjc run ./sdk/helpers.ts trust acc:GP asset:A:GA
	sjc run ./sdk/helpers.ts trust acc:GP asset:B:GB
	sjc run ./sdk/helpers.ts fund acc:G1 # User 1 (Liquidity Provider)
	sjc run ./sdk/helpers.ts trust acc:G1 asset:A:GA
	sjc run ./sdk/helpers.ts trust acc:G1 asset:B:GB
	sjc run ./sdk/helpers.ts trust acc:G1 asset:P:GP
	sjc run ./sdk/helpers.ts pay acc:GA acc:G1 asset:A:GA u63:100000
	sjc run ./sdk/helpers.ts pay acc:GB acc:G1 asset:B:GB u63:100000
	sjc run ./sdk/helpers.ts fund acc:G2 # User 2 (Trader)
	sjc run ./sdk/helpers.ts trust acc:G2 asset:A:GA
	sjc run ./sdk/helpers.ts trust acc:G2 asset:B:GB
	sjc run ./sdk/helpers.ts pay acc:GA acc:G2 asset:A:GA u63:1000
	sjc run ./sdk/helpers.ts pay acc:GB acc:G2 asset:B:GB u63:1000

testrun: $(SJC)
	sjc run contract.ts init acc:GP asset:P:GP asset:A:GA asset:B:GB
	sjc run contract.ts deposit acc:G1 u63:100000 u63:10000
	sjc run contract.ts trade_fixed_in acc:G2 asset:A:GA u63:100 asset:B:GB u63:1
	sjc run contract.ts withdraw acc:G1 u63:31622

build: contract.wasm

contract.wasm: $(SJC) *.ts
	sjc build contract.ts

$(SJC):
	curl -fsSL https://github.com/leighmcculloch/sjc/raw/main/install.sh | sh
