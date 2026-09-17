# Requirements

## Funksjonelt
1. Brukeren kan velge en Pokémon blant alle 811 radene i pokemon.csv.
2. Valgt Pokémon vises med bilde, type(r) og de seks basestatene.
3. Appen finner utviklinger ved å lete etter rader der evolves_from_species_id er lik valgt Pokémons species_id.
4. Tre tilfeller håndteres: ingen utvikling, én utvikling, flere utviklinger.
5. Uten utvikling sier appen det rett ut og gir ingen anbefaling.
6. Med én eller flere vises hver kandidat med bilde, stats, differanse per stat og differanse i sum.
7. Brukeren velger hvilken stat han bryr seg mest om. Anbefalingen tar hensyn til både totalsummen og den valgte staten.
8. Anbefalingen gis som ja eller nei med en begrunnelse i tekst.

## Teknisk
9. Ren HTML, CSS og JavaScript. Ingen rammeverk, ingen npm, ingen build-steg.
10. pokemon.csv ligger i repoet og hentes med fetch over HTTP.
11. Siden hostes på GitHub Pages fra et offentlig repo.
12. Ingen API-nøkler brukes i denne casen.

## Datakjennskap
13. 93 rader har url_image lik strengen "NA" og skal vises uten bilde.
14. 456 rader har evolves_from_species_id lik strengen "NA".
15. 90 rader er alternative former med id over 10000.
16. 11 arter har flere utviklinger. Eevee har åtte.

## Levering
17. Lenke til live nettside.
18. Lenke til offentlig GitHub-repo.
19. Kort statement om tidsbruk.
20. Kort statement om kostnad, inkludert hvor mye av gratiskvoten som ble brukt.
