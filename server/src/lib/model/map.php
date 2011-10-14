<?

class model_Map {
    public static $filenameRe = '/^((?<name>.*) \((?<artist>.*)\) \\[(?<difficulty>.*)\\])\.osu$/';

    protected $fullPath;
    protected $gateway;

    protected $name;
    protected $artist;
    protected $difficulty;

    function __construct($fullPath, $gateway) {
        $this->fullPath = $fullPath;
        $this->gateway = $gateway;

        $matches = null;
        if (!preg_match(self::$filenameRe, $this->filename(), $matches)) {
            throw new Error('Bad map name');
        }

        $this->name = $matches['name'];
        $this->artist = $matches['artist'];
        $this->difficulty = $matches['difficulty'];
    }

    function filename() {
        return basename($this->fullPath);
    }

    function webPath() {
        return relativePath(WEB_ROOT, $this->fullPath);
    }

    function mapPath() {
        return relativePath($this->gateway->mapsRoot(), $this->fullPath);
    }

    function fullPath() {
        return $this->fullPath;
    }

    function title() {
        return $this->name() . ' [' . $this->difficulty() . ']';
    }

    function name() {
        return $this->name;
    }

    function artist() {
        return $this->artist;
    }

    function difficulty() {
        return $this->difficulty;
    }

    function urlParams() {
        return array(
            'map' => $this->mapPath()
        );
    }
}
