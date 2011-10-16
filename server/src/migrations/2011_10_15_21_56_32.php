<?php

class Migration_2011_10_15_21_56_32 extends MpmMigration {
    public function up(PDO &$pdo) {
        $pdo->exec(<<<Q
            CREATE TABLE owp_maps (
                id int(11) NOT NULL AUTO_INCREMENT,
                song_name varchar(128) NOT NULL,
                artist_name varchar(128) NOT NULL,
                difficulty_name varchar(64) NOT NULL,
                mapper_name varchar(128) NOT NULL,
                submit_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_public tinyint(1) NOT NULL DEFAULT 1,
                map_root varchar(1024) NOT NULL,
                map_file varchar(256) NOT NULL,
                PRIMARY KEY (id)
            )
Q
);
    }

    public function down(PDO &$pdo) {
        $pdo->exec(<<<Q
            DROP TABLE owp_maps
Q
);
    }
}
