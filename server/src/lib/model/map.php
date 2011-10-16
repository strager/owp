<?

class model_Map {
    protected $gateway;
    protected $id;

    protected $songName;
    protected $artistName;
    protected $difficultyName;
    protected $mapperName;
    protected $submitDate;

    protected $mapRoot;
    protected $mapFile;

    function __construct($gateway, $dbData) {
        $this->gateway = $gateway;

        $this->id = $dbData['id'];
        $this->songName = $dbData['song_name'];
        $this->artistName = $dbData['artist_name'];
        $this->difficultyName = $dbData['difficulty_name'];
        $this->mapperName = $dbData['mapper_name'];
        $this->submitDate = $dbData['submit_date'];
        $this->mapRoot = $dbData['map_root'];
        $this->mapFile = $dbData['map_file'];
    }

    function id() {
        return $this->id;
    }

    function rootFullPath() {
        return $this->gateway->mapsRoot() . '/' . $this->mapRoot;
    }

    function rootWebPath() {
        return relativePath(WEB_ROOT, $this->rootFullPath());
    }

    function mapRoot() {
        return $this->mapRoot;
    }

    function mapFile() {
        return $this->mapFile;
    }

    function title() {
        return $this->artistName() . ' - ' . $this->songName() . ' [' . $this->difficultyName() . ']';
    }

    function songName() {
        return $this->songName;
    }

    function artistName() {
        return $this->artistName;
    }

    function difficultyName() {
        return $this->difficultyName;
    }

    function urlParams() {
        return array(
            'map' => $this->id()
        );
    }
}
