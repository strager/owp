<?php

class Migration_2011_10_05_06_18_04 extends MpmMigration {
    public function up(PDO &$pdo) {
        $pdo->exec(<<<Q
            CREATE TABLE owp_reports (
                date datetime NOT NULL,
                source_ip varchar(128) NOT NULL,
                report_text mediumtext NOT NULL
            )
Q
);
    }

    public function down(PDO &$pdo) {
        $pdo->exec(<<<Q
            DROP TABLE owp_reports
Q
);
    }

}
