<?php

class ApplicationFactory {
    public $template_dir;

    public $db_host;
    public $db_database;
    public $db_port;
    public $db_username;
    public $db_password;

    public $forum_table_prefix;

    public $owp_script_path;
    public $owp_skin_root;
    public $owp_maps_root;

    public $ga_account_id;

    public $twitter;

    function new_PDO($c) {
        $dsn = 'mysql:host=' . $this->db_host . ';dbname=' . $this->db_database . ';port=' . $this->db_port;
        return new PDO($dsn, $this->db_username, $this->db_password);
    }

    function new_k_TemplateFactory($c) {
        return new k_DefaultTemplateFactory($this->template_dir);
    }

    function new_owpjs($c) {
        return new owpjs($this->owp_script_path, $this->owp_skin_root, $this->owp_maps_root);
    }

    function new_googleanalytics($c) {
        return new googleanalytics($c->create('k_TemplateFactory'), $this->ga_account_id);
    }

    function new_socialnetworks($c) {
        $sn = new socialnetworks($c->create('k_TemplateFactory'));
        $sn->twitter = $this->twitter;
        return $sn;
    }
}
