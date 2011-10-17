<?php

class model_Upload {
    protected $gateway;

    protected $id;
    protected $sha512;
    protected $filename;
    protected $submitDate;
    protected $sourceIP;

    function __construct($gateway, $dbData) {
        $this->gateway = $gateway;

        $this->id = $dbData['id'];
        $this->sha512 = $dbData['sha512'];
        $this->filename = $dbData['filename'];
        $this->submitDate = $dbData['submit_date'];
        $this->sourceIP = $dbData['source_ip'];
    }

    function id() {
        return $this->id;
    }
}
