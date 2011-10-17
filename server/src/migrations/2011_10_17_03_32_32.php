<?php

class Migration_2011_10_17_03_32_32 extends MpmMigration {
    public function up(PDO &$pdo) {
        $pdo->exec(<<<Q
            ALTER TABLE owp_maps ADD
            upload_id INT NULL
Q
);
    }

    public function down(PDO &$pdo) {
        $pdo->exec(<<<Q
            ALTER TABLE owp_maps DROP upload_id
Q
);
    }
}
