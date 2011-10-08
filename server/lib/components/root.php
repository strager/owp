<?php

class components_Root extends k_Component {
    protected $templates;
    protected $ga;
    protected $social;

    function __construct(k_TemplateFactory $templates, googleanalytics $ga, socialnetworks $social) {
        $this->templates = $templates;
        $this->ga = $ga;
        $this->social = $social;
    }

    function map($name) {
        switch ($name) {
        case 'game':
            return 'components_game_game';
        }
    }

    function execute() {
        return $this->wrap(parent::execute());
    }

    function wrapHtml($content) {
        $this->document->addStyle($this->url('css/main.css'));

        $t = $this->templates->create('document');

        return $t->render($this, array(
            'content' => $content,
            'title' => $this->document->title(),
            'scripts' => $this->document->scripts(),
            'styles' => $this->document->styles(),
            'onload' => $this->document->onload(),
            'ga' => $this->ga->renderJs(),
            'social' => $this->social->renderHtml()
        ));
    }

    function renderHtml() {
        $t = $this->templates->create('root');
        return $t->render($this);
    }
}
