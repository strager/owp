<?php

class model_MapGateway {
    protected $mapsRoot;

    function __construct(owpjs $owpjs) {
        // FIXME MapGateway shouldn't depend upon owpjs
        $this->mapsRoot = $owpjs->mapsRoot;
    }

    function mapsRoot() {
        return $this->mapsRoot;
    }

    function getMapFromParts($parts) {
        $mapPath = @$parts['map'];

        if (!$mapPath) {
            return null;
        }

        // FIXME This is totally lame
        $maps = $this->getAllMaps();
        foreach ($maps as $map) {
            if ($map->mapPath() === $parts['map']) {
                return $map;
            }
        }

        return null;
    }

    function getAllMaps() {
        $maps = array();

        $root = $this->mapsRoot;
        $dirs = scandir($root);
        foreach ($dirs as $dir) {
            $mapDir = $root . DIRECTORY_SEPARATOR . $dir;
            if (!is_dir($mapDir)) {
                continue;
            }

            $files = scandir($mapDir);

            foreach($files as $file) {
                if (preg_match(model_Map::$filenameRe, $file)) {
                    $maps[] = new model_Map($mapDir . DIRECTORY_SEPARATOR . $file, $this);
                }
            }
        }

        return $maps;
    }
}
