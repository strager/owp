<?php

class owpjs {
    public $playfieldId;

    public $owpScriptPath;
    public $skinRoot;
    public $mapsRoot;

    protected $actions;

    function __construct($owpScriptPath, $skinRoot, $mapsRoot) {
        $this->owpScriptPath = $owpScriptPath;
        $this->skinRoot = $skinRoot;
        $this->mapsRoot = $mapsRoot;

        $this->playfieldId = 'my_playfield';
    }

    function loadSkin($skinName = null) {
        // TODO Use $skinName
        $this->actions[] = array('loadSkin', $this->skinRoot);

        return $this;
    }

    function startMap($map) {
        $this->actions[] = array('startMap', $map);

        return $this;
    }

    function render($context, $document) {
        if (empty($this->actions)) {
            return;
        }

        $js = '';

        $playfieldIdJson = json_encode($this->playfieldId);
        $js .= "owp.init(document.getElementById(${playfieldIdJson}));";

        foreach ($this->actions as $action) {
            switch ($action[0]) {
            case 'loadSkin':
                list($_, $skinRoot) = $action;
                $skinRootJson = json_encode($context->url(relativePath(WEB_ROOT, dirname($skinRoot))));
                $js .= "owp.game.loadSkin(${skinRootJson});";
                break;

            case 'startMap':
                list($_, $map) = $action;
                $mapRootJson = json_encode($context->url(dirname($map->webPath())));
                $mapNameJson = json_encode(basename($map->filename(), '.osu'));
                $js .= "owp.game.startMap(${mapRootJson}, ${mapNameJson});";
                break;

            default:
                throw new Exception('Unknown action type: ' . $action[0]);
            }
        }

        $document->addScript($context->url(relativePath(WEB_ROOT, $this->owpScriptPath)));
        $document->addOnload($js);
    }
}
