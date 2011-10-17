<?php

class Migration_2011_10_17_03_28_46 extends MpmMigration {
    public function up(PDO &$pdo) {
        $pdo->exec(<<<Q
            ALTER TABLE owp_uploads CHANGE
            sha512 sha512 char(128) NOT NULL
Q
);
    }

    public function down(PDO &$pdo) {
        $pdo->exec(<<<Q
            ALTER TABLE owp_uploads CHANGE
            sha512 sha512 char(32) NOT NULL
Q
);
    }
}
