<?php

class googleanalytics {
    protected $templates;
    protected $accountId;

    function __construct(k_TemplateFactory $templates, $accountId) {
        $this->templates = $templates;
        $this->accountId = $accountId;
    }

    function renderJs() {
        if ($this->accountId === null) {
            return '';
        }

        $t = $this->templates->create('googleanalytics');
        return $t->render(null, array(
            'accountId' => $this->accountId
        ));
    }
}
