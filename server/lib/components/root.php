<?php

class components_Root extends k_Component {
    protected $templates;

    function __construct(k_TemplateFactory $templates) {
        $this->templates = $templates;
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
        // FIXME Where should I put this?
        $this->document->addStyle($this->url('css/main.css'));

        $t = $this->templates->create('document');

        return $t->render($this, array(
            'content' => $content,
            'title' => $this->document->title(),
            'scripts' => $this->document->scripts(),
            'styles' => $this->document->styles(),
            'onload' => $this->document->onload()
        ));
    }

    function renderHtml() {
        $t = $this->templates->create('root');
        return $t->render($this);
    }
}
