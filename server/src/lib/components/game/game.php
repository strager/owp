<?php

class components_game_game extends owpcomponent {
    protected $templates;
    protected $mapGateway;

    function __construct(k_TemplateFactory $templates, model_MapGateway $mapGateway) {
        $this->templates = $templates;
        $this->mapGateway = $mapGateway;
    }

    function map($name) {
        switch ($name) {
        case 'play':
            return 'components_game_play';
        }
    }

    function renderHtml() {
        $this->document->setTitle('owp maps');

        $t = $this->templates->create('maplist');
        return $t->render($this, array(
            'maps' => $this->mapGateway->getAllMaps()
        ));
    }
}
