<?php

class model_MapGateway {
    private static $mapFields = 'id, song_name, artist_name, difficulty_name, mapper_name, map_root, map_file, UNIX_TIMESTAMP(submit_date) AS submit_date';
    //private static $osuFilenameRe = '/^((?<artist>.*) - (?<song>.*) \((?<mapper>.*)\) \\[(?<difficulty>.*)\\])\.osu$/i';

    protected $mapsRoot;
    protected $db;

    function __construct($mapsRoot, PDO $db) {
        $this->mapsRoot = $mapsRoot;
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

    private function getMapsByIDs($ids) {
        $quotedIDs = array();
        foreach ($ids as $id) {
            $quotedIDs[] = $this->db->quote((int) $id);
        }

        $result = $this->db->query('SELECT ' . self::$mapFields . ' FROM owp_maps WHERE id IN (' . implode(', ', $quotedIDs) . ')');

        $maps = array();
        while (($row = $result->fetch()) !== false) {
            $maps[] = new model_Map($this, $row);
        }
        return $maps;
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

    function saveOsz($oszFilePath) {
        $zip = new ZipArchive();
        if ($zip->open($oszFilePath) !== true) {
            throw new Exception('Failed to open osz');
        }

        $mapDirectory = realpath($this->makeMapDirectory());

        $safeFiles = array();
        $osuFiles = array();
        for ($i = 0; $i < $zip->numFiles; ++$i) {
            $stat = $zip->statIndex($i);
            $filename = $stat['name'];
            $outPath = relativePath($mapDirectory, $mapDirectory . '/' . $filename);

            if (preg_match(',^[\\\\\\/\\.],', $outPath)) {
                // File entry is something like "foo/../../../../etc/passwd"
                // or this is a dot file.
                // Ignore for security reasons
            } else {
                if (preg_match('/\\.osu$/i', $filename)) {
                    $osuFiles[] = $filename;
                }

                $safeFiles[] = $filename;
            }
        }

        if (empty($osuFiles)) {
            throw new Exception('Not an osz file');
        }

        if (!$zip->extractTo($mapDirectory, $safeFiles)) {
            throw new Exception('Failed to extract osz');
        }

        $zip->close();

        $statement = $this->db->prepare('INSERT INTO owp_maps (song_name, artist_name, difficulty_name, mapper_name, map_root, map_file) VALUES (:song_name, :artist_name, :difficulty_name, :mapper_name, :map_root, :map_file)');

        $mapIDs = array();
        foreach ($osuFiles as $osuFile) {
            // Hacky way to read an .osu file
            // Example:
            //
            // Title:THANK YOU FOR PLAYING
            // Artist:SUPER STAR -MITSURU-
            // Creator:Natteke
            // Version:Normal
            // Source:Beatmania IIDX

            $songName = $artistName = $mapperName = $difficultyName = '(null)';

            $path = $mapDirectory . '/' . $osuFile;
            $source = file_get_contents($path);

            $matches = null;
            if (preg_match('/^Title:(.*)$/m', $source, $matches)) {
                $songName = trim($matches[1]);
            }
            if (preg_match('/^Artist:(.*)$/m', $source, $matches)) {
                $artistName = trim($matches[1]);
            }
            if (preg_match('/^Version:(.*)$/m', $source, $matches)) {
                $difficultyName = trim($matches[1]);
            }
            if (preg_match('/^Creator:(.*)$/m', $source, $matches)) {
                $mapperName = trim($matches[1]);
            }

            $statement->bindValue('song_name', $songName);
            $statement->bindValue('artist_name', $artistName);
            $statement->bindValue('difficulty_name', $difficultyName);
            $statement->bindValue('mapper_name', $mapperName);
            $statement->bindValue('map_root', relativePath($this->mapsRoot, $mapDirectory));
            $statement->bindValue('map_file', $osuFile);
            $statement->execute();
            $id = $this->db->lastInsertId();
            $statement->closeCursor();

            $mapIDs[] = $id;
        }

        return $this->getMapsByIDs($mapIDs);
    }

    function makeMapDirectory() {
        $dirnameChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        $length = 10;
        $tries = 0;

        if (!is_writable($this->mapsRoot)) {
            throw new Exception('Map root not write-able');
        }

        while (true) {
            ++$tries;

            if ($tries % 10 === 0) {
                // Every 10 tries, increase directory name length
                ++$length;
            }

            if ($tries >= 50) {
                throw new Exception('Exhausted');
            }

            // Random directory name
            $dirname = substr(str_shuffle(str_repeat($dirnameChars, $length)), 0, $length);
            $fullPath = $this->mapsRoot . '/' . $dirname;
            if (file_exists($fullPath)) {
                continue;
            }

            $success = mkdir($fullPath);
            if (!$success) {
                continue;
            }

            return $fullPath;
        }
    }
}
