# Sudoku Generator
![grafik](https://github.com/user-attachments/assets/5fa180b4-6a72-46d9-a687-946324c545b3)

This simple web app generates the desired Sudoku (9x9, 12x12, 16x16)(normal, jigsaw)(difficulty from 20% to 80%) in the webbrowser using web workers.

While this is quite good for normal sudokus jigsaw sudokus are not really possible except for 9x9 and a long time. Therefore the project https://github.com/MrCodeEU/sudoku_gen_go exists as this go implimentation can generate 100 12x12 Sudokus in around 1 hour.

# Sudoku List viewer

All generated sudokus (via the web interaface or the go cli) can be saved in a databse. This webapp then allows the user to list and filter for desired sudokus and select up to 50 sudokus at once for printing.
![grafik](https://github.com/user-attachments/assets/2c2ccb8f-4ccb-4297-8744-8336b1e37a77)


The selected sudokus can than be printed with or without solution and with or wothout colors.
![grafik](https://github.com/user-attachments/assets/d24ab154-79e5-4ff6-aac9-0a1f09823702)
![grafik](https://github.com/user-attachments/assets/2d32025a-c403-4dc1-b668-968436c96712)
