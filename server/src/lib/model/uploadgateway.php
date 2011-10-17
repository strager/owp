<?php

class model_UploadGateway {
    private static $uploadFields = 'id, sha512, filename, source_ip, UNIX_TIMESTAMP(submit_date) AS submit_date, type';

    protected $db;

    function __construct(PDO $db) {
        $this->db = $db;
    }

    function getFileUploadKey($filePath) {
        // An upload key uniquely identifies any upload, reported or not.
        // It is just the SHA512 hash, because that's unique enough.
        return hash_file('sha512', $filePath, false);
    }

    function findUploadByKey($key) {
        $statement = $this->db->prepare('SELECT ' . self::$uploadFields . ' FROM owp_uploads WHERE sha512 = :sha512 LIMIT 1');
        $statement->bindValue('sha512', $key);
        $statement->execute();

        $row = $statement->fetch();
        if ($row !== false) {
            return new model_Upload($this, $row);
        } else {
            return null;
        }
    }

    function reportUpload($type, $key, $uploadFilename, $ip) {
        if ($this->findUploadByKey($key) !== null) {
            throw new Exception('Cannot report upload with duplicate key');
        }

        $statement = $this->db->prepare('INSERT INTO owp_uploads (sha512, filename, source_ip, type) VALUES (:sha512, :filename, :source_ip, :type)');
        $statement->bindValue('source_ip', $ip);
        $statement->bindValue('filename', $uploadFilename);
        $statement->bindValue('sha512', $key);
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
