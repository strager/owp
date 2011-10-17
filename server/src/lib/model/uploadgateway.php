<?php

class model_UploadGateway {
    private static $uploadFields = 'id, sha512, filename, source_ip, UNIX_TIMESTAMP(submit_date) AS submit_date, type';

    protected $db;

    function __construct(PDO $db) {
        $this->db = $db;
    }

    function reportUpload($type, $uploadFilename, $filePath, $ip) {
        $sha512 = hash_file('sha512', $filePath, false);

        $statement = $this->db->prepare('INSERT INTO owp_uploads (sha512, filename, source_ip, type) VALUES (:sha512, :filename, :source_ip, :type)');
        $statement->bindValue('source_ip', $ip);
        $statement->bindValue('filename', $uploadFilename);
        $statement->bindValue('sha512', $sha512);
        $statement->bindValue('type', $type);
        $statement->execute();

        $statement = $this->db->prepare('SELECT ' . self::$uploadFields . ' FROM owp_uploads WHERE id = :id LIMIT 1');
        $statement->bindValue('id', $this->db->lastInsertId());
        $statement->execute();

        $row = $statement->fetch();
        if ($row !== false) {
            return new model_Upload($this, $row);
        } else {
            return null;
        }
    }
}
