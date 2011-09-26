ROOT := $(CURDIR)

BUILD_DIR := $(ROOT)/build
PROD_DIR := $(ROOT)/prod_tmp

BIN_DIR := $(ROOT)/bin
SRC_DIR := $(ROOT)/src
SERVER_DIR := $(ROOT)/server

all:
	@echo 'Targets: lint deploy_local deploy_staging deploy_prod' >&2

deploy_local: $(PROD_DIR)
	@mkdir -p $(ROOT)/demo
	rsync -rlt -v $(PROD_DIR)/ $(ROOT)/demo

deploy_staging: $(PROD_DIR)
	rsync -rlt -zv $(PROD_DIR)/ train:owp/staging

deploy_prod: $(PROD_DIR)
	@echo ''
	@echo '_________________________________________'
	@echo -e '\033[1;35mType "\033[4;35msrsly\033[0m\033[1;35m" to deploy owp to production:\033[0m'
	@read entered_text ; [ "$$entered_text" = "srsly" ]
	rsync -rlt -zv $(PROD_DIR)/ train:owp/demo

lint:
	./lint.sh >&2

$(BUILD_DIR)/owp.js: $(shell find $(SRC_DIR) -name '*.js' -or -name '*.png')
	@mkdir -p $(BUILD_DIR)
	$(BIN_DIR)/build.sh "$@"

$(PROD_DIR): $(BUILD_DIR)/owp.js
	@rm -rf $(PROD_DIR)
	@mkdir -p "$@"
	cp "$<" $(PROD_DIR)
	cp $(SERVER_DIR)/*.php $(PROD_DIR)
	cp $(SERVER_DIR)/*.css $(PROD_DIR)
	rm $(PROD_DIR)/config.php $(PROD_DIR)/config.example.php
	ln -s map-select.php $(PROD_DIR)/index.php

.PHONY: all deploy_local deploy_staging deploy_prod lint $(PROD_DIR)
