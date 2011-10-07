<?php

class components_game_play extends k_Component {
    protected $templates;
    protected $owpjs;

    function __construct(k_TemplateFactory $templates, owpjs $owpjs) {
        $this->templates = $templates;
        $this->owpjs = $owpjs;
    }

    function renderHtml() {
        $this->owpjs->loadSkin();
        $this->owpjs->startMap('map');
        $this->owpjs->render($this->document);

        $t = $this->templates->create('playfield');
        return $t->render($this, array(
            'playfieldId' => $this->owpjs->playfieldId
        ));
    }
}
