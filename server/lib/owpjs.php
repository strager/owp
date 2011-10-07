<?php

class owpjs {
    public $playfieldId;

    protected $owpScriptPath;
    protected $skinRoot;
    protected $mapRoot;

    protected $actions;

    function __construct($owpScriptPath, $skinRoot, $mapRoot) {
        $this->owpScriptPath = $owpScriptPath;
        $this->skinRoot = $skinRoot;
        $this->mapRoot = $mapRoot;

        $this->playfieldId = 'my_playfield';
    }

    function loadSkin($skinName = null) {
        // TODO Use $skinName
        $skinRootJson = json_encode($this->skinRoot);
        $this->actions[] = "owp.game.loadSkin(${skinRootJson});";

        return $this;
    }

    function startMap($mapName) {
        $mapRootJson = json_encode($this->mapRoot);
        $mapNameJson = json_encode($mapName);
        $this->actions[] = "owp.game.startMap(${mapRootJson}, ${mapNameJson});";

        return $this;
    }

    function render($document) {
        if (empty($this->actions)) {
            return;
        }

        $playfieldIdJson = json_encode($this->playfieldId);
        $js = "owp.init(document.getElementById(${playfieldIdJson}));";
        $js .= implode('', $this->actions);

        $document->addScript($this->owpScriptPath);
        $document->addOnload($js);
    }
}
