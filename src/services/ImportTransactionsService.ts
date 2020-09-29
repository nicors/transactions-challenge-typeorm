import { getCustomRepository, getRepository, In } from 'typeorm';
import csvtojson from 'csvtojson';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const transactionsJson = await csvtojson().fromFile(filePath);

    const categories = transactionsJson.map(
      transactionJson => transactionJson.category,
    );

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      existingCategory => existingCategory.title,
    );

    const categoriesToAdd = categories
      .filter(
        categoryTitle => !existentCategoriesTitles.includes(categoryTitle),
      )
      .filter(
        (value, index, categoriesArray) =>
          categoriesArray.indexOf(value) === index,
      );

    const newCategories = categoryRepository.create(
      categoriesToAdd.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const newTransactionsCategories = [...newCategories, ...existentCategories];

    const transactions = transactionsRepository.create(
      transactionsJson.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: newTransactionsCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(transactions);

    return transactions;
  }
}

export default ImportTransactionsService;
