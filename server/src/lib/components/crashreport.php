<?php

class components_crashreport extends owpcomponent {
    protected $db;

    function __construct(PDO $db) {
        $this->db = $db;
    }

    function postJson() {
        if (!$this->process()) {
            throw new Exception('Bad POST');
        }

        return new k_JsonResponse(array());
    }

    function process() {
        $date = date('c');
        $sourceIp = $this->remoteAddr();
        $reportText = file_get_contents('php://input');

        $statement = $this->db->prepare('INSERT INTO owp_reports (date, source_ip, report_text) VALUES (:date, :source_ip, :report_text)');
        $statement->bindParam(':date', $date);
        $statement->bindParam(':source_ip', $sourceIp);
        $statement->bindParam(':report_text', $reportText);
        $statement->execute();

        return true;
    }
}
