<?php

class components_game_tutorial extends owpcomponent {
    protected $templates;
    protected $owpjs;

    function __construct(k_TemplateFactory $templates, owpjs $owpjs) {
        $this->templates = $templates;
        $this->owpjs = $owpjs;
    }

    function renderHtml() {
        $this->owpjs->loadSkin();
        $this->owpjs->startTutorial();
        $this->owpjs->render($this, $this->document);

        $this->document->setTitle('owp tutorial');

        $t = $this->templates->create('playfield');
        $playfieldHtml = $t->render($this, array(
            'playfieldId' => $this->owpjs->playfieldId
        ));

        $t = $this->templates->create('tutorial');
        return $t->render($this, array(
            'playfieldHtml' => $playfieldHtml
        ));
    }
}
