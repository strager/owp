<?php

class Migration_2011_10_17_02_40_07 extends MpmMigration {
    public function up(PDO &$pdo) {
        $pdo->exec(<<<Q
            CREATE TABLE owp_uploads (
                id int(11) NOT NULL AUTO_INCREMENT,
                sha512 char(32) NOT NULL,
                filename varchar(256) NULL,
                submit_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                source_ip varchar(128) NOT NULL,
                type varchar(32) NULL,
                PRIMARY KEY (id)
            )
Q
);
    }

    public function down(PDO &$pdo) {
        $pdo->exec(<<<Q
            DROP TABLE owp_uploads
Q
);
    }
}
