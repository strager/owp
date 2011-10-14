<?php

class socialnetworks {
    protected $templates;

    public $twitter;

    function __construct(k_TemplateFactory $templates) {
        $this->templates = $templates;
    }

    function renderHtml() {
        $t = $this->templates->create('socialnetworks');
        return $t->render(null, array(
            'twitter' => $this->twitter
        ));
    }
}
