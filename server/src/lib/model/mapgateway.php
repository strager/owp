<?php

class model_MapGateway {
    private static $mapFields = 'id, song_name, artist_name, difficulty_name, mapper_name, map_root, map_file, UNIX_TIMESTAMP(submit_date) AS submit_date';

    protected $mapsRoot;
    protected $db;

    function __construct(owpjs $owpjs, PDO $db) {
        // FIXME MapGateway shouldn't depend upon owpjs
        $this->mapsRoot = $owpjs->mapsRoot;
        $this->db = $db;
    }

    function mapsRoot() {
        return $this->mapsRoot;
    }

    function getMapFromParts($parts) {
        $mapID = @$parts['map'];

        if (!$mapID) {
            return null;
        }

        $statement = $this->db->prepare('SELECT ' . self::$mapFields . ' FROM owp_maps WHERE is_public = 1 AND id = :id LIMIT 1');
        $statement->bindValue('id', $mapID);
        $statement->execute();

        $row = $statement->fetch();
        if ($row === false) {
            return null;
        }

        return new model_Map($this, $row);
    }

    function getAllMaps() {
        $statement = $this->db->prepare('SELECT ' . self::$mapFields . ' FROM owp_maps WHERE is_public = 1');
        $statement->execute();

        $maps = array();
        while (($row = $statement->fetch()) !== false) {
            $maps[] = new model_Map($this, $row);
        }

        return $maps;
    }
}
