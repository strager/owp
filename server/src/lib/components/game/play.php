<?php

class components_game_play extends owpcomponent {
    protected $templates;
    protected $owpjs;
    protected $mapGateway;

    function __construct(k_TemplateFactory $templates, owpjs $owpjs, model_MapGateway $mapGateway) {
        $this->templates = $templates;
        $this->owpjs = $owpjs;
        $this->mapGateway = $mapGateway;
    }

    function renderHtml() {
        $map = $this->mapGateway->getMapFromParts($_GET);

        if ($map === null) {
            throw new Exception('Invalid map');
        }

        $this->owpjs->loadSkin();
        $this->owpjs->startMap($map);
        $this->owpjs->render($this, $this->document);

        $this->document->setTitle($map->title());

        $t = $this->templates->create('playfield');
        return $t->render($this, array(
            'playfieldId' => $this->owpjs->playfieldId
        ));
    }
}
